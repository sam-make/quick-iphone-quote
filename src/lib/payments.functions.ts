import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { environmentSchema } from "./subscription";
const inputSchema = z.object({ environment: environmentSchema }).strict();
export const getShopSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof inputSchema>) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("shop_subscriptions")
      .select("status,current_period_end,cancel_at_period_end,price_id,updated_at")
      .eq("environment", data.environment)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows;
  });
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof inputSchema>) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const { assertPlanPrice } = await import("./subscription");
      const { data: profile, error: pError } = await context.supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", context.userId)
        .single();
      const { data: isAdmin, error: rError } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (pError || rError || !profile || !isAdmin)
        throw new Error("Seul un administrateur peut souscrire pour sa boutique.");
      const {
        data: { user },
        error: uError,
      } = await context.supabase.auth.getUser();
      if (uError || !user?.email) throw new Error("Compte e-mail introuvable.");
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: ["trade_in_pro_monthly"],
        active: true,
        limit: 1,
      });
      const price = prices.data[0];
      if (!price) throw new Error("Prix introuvable.");
      assertPlanPrice(price, data.environment);
      const customerId = await resolveOrCreateCustomer(stripe, {
        userId: context.userId,
        email: user.email,
      });
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
      if (subs.data.some((s) => !["canceled", "incomplete_expired"].includes(s.status)))
        throw new Error("Un abonnement existe déjà. Utilisez le portail client.");
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        ui_mode: "embedded_page",
        customer: customerId,
        line_items: [{ price: price.id, quantity: 1 }],
        return_url: `${new URL(getRequest().url).origin}/abonnement?retour=1`,
        metadata: { userId: context.userId, shopId: profile.shop_id },
        subscription_data: { metadata: { userId: context.userId, shopId: profile.shop_id } },
        managed_payments: { enabled: true },
      } as import("stripe").default.Checkout.SessionCreateParams);
      if (!session.client_secret) throw new Error("Stripe n’a pas renvoyé de formulaire.");
      return { clientSecret: session.client_secret };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
export const createPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof inputSchema>) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (error || !isAdmin) throw new Error("Seul un administrateur peut gérer l’abonnement.");
      const stripe = createStripeClient(data.environment);
      const customers = await stripe.customers.search({
        query: `metadata['userId']:'${context.userId}'`,
        limit: 1,
      });
      const customer = customers.data[0];
      if (!customer) throw new Error("Aucun compte de facturation.");
      const portal = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${new URL(getRequest().url).origin}/abonnement`,
      });
      return { url: portal.url };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof import("./stripe.server").createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId)
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}
