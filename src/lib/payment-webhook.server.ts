import Stripe from "stripe";
import { z } from "zod";
import { createStripeClient, type StripeEnv } from "./stripe.server";
import { assertPlanPrice, subscriptionStatusSchema } from "./subscription";
const eventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  created: z.number().int().nonnegative(),
  livemode: z.boolean(),
  data: z.object({ object: z.record(z.unknown()) }),
});
export async function verifyWebhook(request: Request, env: StripeEnv) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new Error("Missing signature");
  const secret =
    env === "sandbox"
      ? process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"]
      : process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Webhook secret is not configured");
  const raw = await request.text();
  if (raw.length > 1000000) throw new Error("Payload too large");
  const event = await createStripeClient(env).webhooks.constructEventAsync(
    raw,
    signature,
    secret,
    300,
    Stripe.createSubtleCryptoProvider(),
  );
  const parsed = eventSchema.parse(event);
  // Un événement live ne doit jamais être traité avec les identifiants de test,
  // et inversement : le mode de l'événement doit correspondre à l'environnement.
  if (parsed.livemode !== (env === "live")) throw new Error("Environment mismatch");
  return parsed;
}
export type PaymentEvent = z.infer<typeof eventSchema>;
export function eventSubscriptionId(event: PaymentEvent): string | null {
  const obj = event.data.object;
  if (event.type.startsWith("customer.subscription."))
    return typeof obj.id === "string" ? obj.id : null;
  if (event.type.startsWith("checkout.session."))
    return typeof obj.subscription === "string" ? obj.subscription : null;
  if (event.type.startsWith("invoice.")) {
    const parent = obj.parent as { subscription_details?: { subscription?: unknown } } | undefined;
    const id = parent?.subscription_details?.subscription ?? obj.subscription;
    return typeof id === "string" ? id : null;
  }
  return null;
}
export async function processEvent(event: PaymentEvent, env: StripeEnv) {
  const id = eventSubscriptionId(event);
  if (!id) return { ignored: true };
  const stripe = createStripeClient(env);
  // Re-read authoritative state, not delivery order or a Checkout success flag.
  const sub = await stripe.subscriptions.retrieve(id);
  const item = sub.items.data[0];
  if (!item || sub.items.data.length !== 1 || item.quantity !== 1)
    throw new Error("Unexpected subscription items");
  assertPlanPrice(item.price, env);
  if (item.price.lookup_key !== "trade_in_pro_monthly") throw new Error("Unexpected plan");
  const userId = z.string().uuid().parse(sub.metadata.userId);
  const shopId = z.string().uuid().parse(sub.metadata.shopId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || customer.metadata.userId !== userId)
    throw new Error("Customer ownership mismatch");
  const status = subscriptionStatusSchema.parse(sub.status);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("apply_subscription_event", {
    p_environment: env,
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created: event.created,
    p_subscription_id: sub.id,
    p_customer_id: customerId,
    p_user_id: userId,
    p_shop_id: shopId,
    p_status: status,
    p_period_end: new Date(item.current_period_end * 1000).toISOString(),
    p_cancel: sub.cancel_at_period_end,
  });
  if (error) throw new Error(error.message);
  return { processed: data };
}
