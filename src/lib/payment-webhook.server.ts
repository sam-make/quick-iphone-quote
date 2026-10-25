import Stripe from "stripe";
import { z } from "zod";
import { createStripeClient } from "./stripe.server";
import { assertTestPrice, subscriptionStatusSchema } from "./subscription";
const eventSchema = z.object({
  id: z.string().min(1).max(255),
  type: z.string().min(1).max(255),
  created: z.number().int().nonnegative(),
  livemode: z.literal(false),
  data: z.object({ object: z.record(z.unknown()) }),
});
export async function verifyTestWebhook(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new Error("Missing signature");
  const secret = process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"];
  if (!secret) throw new Error("PAYMENTS_SANDBOX_WEBHOOK_SECRET is not configured");
  const raw = await request.text();
  if (raw.length > 1000000) throw new Error("Payload too large");
  const event = await createStripeClient("sandbox").webhooks.constructEventAsync(
    raw,
    signature,
    secret,
    300,
    Stripe.createSubtleCryptoProvider(),
  );
  return eventSchema.parse(event);
}
export type TestEvent = z.infer<typeof eventSchema>;
export function eventSubscriptionId(event: TestEvent): string | null {
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
export async function processTestEvent(event: TestEvent) {
  const id = eventSubscriptionId(event);
  if (!id) return { ignored: true };
  const stripe = createStripeClient("sandbox");
  // Re-read authoritative state, not delivery order or a Checkout success flag.
  const sub = await stripe.subscriptions.retrieve(id);
  const item = sub.items.data[0];
  if (!item || sub.items.data.length !== 1 || item.quantity !== 1)
    throw new Error("Unexpected subscription items");
  assertTestPrice(item.price);
  if (item.price.lookup_key !== "trade_in_pro_monthly") throw new Error("Unexpected plan");
  const userId = z.string().uuid().parse(sub.metadata.userId);
  const shopId = z.string().uuid().parse(sub.metadata.shopId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || customer.metadata.userId !== userId)
    throw new Error("Customer ownership mismatch");
  const status = subscriptionStatusSchema.parse(sub.status);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("apply_test_subscription_event", {
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
