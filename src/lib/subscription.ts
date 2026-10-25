import { z } from "zod";
export const PLAN = {
  priceId: "trade_in_pro_monthly",
  amount: 1099,
  currency: "eur",
  interval: "month",
} as const;
export const environmentSchema = z.enum(["sandbox", "live"]);
export const subscriptionStatusSchema = z.enum([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
]);
export type SubscriptionState = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};
export function hasSubscriptionAccess(sub: SubscriptionState | null, now = Date.now()): boolean {
  if (!sub?.current_period_end || Date.parse(sub.current_period_end) <= now) return false;
  return ["active", "trialing", "past_due", "canceled"].includes(sub.status);
}
export function assertPlanPrice(
  price: {
    unit_amount: number | null;
    currency: string;
    livemode: boolean;
    recurring: { interval: string; interval_count: number } | null;
    tax_behavior?: string | null;
  },
  environment: "sandbox" | "live",
) {
  if (
    price.livemode !== (environment === "live") ||
    price.unit_amount !== PLAN.amount ||
    price.currency !== PLAN.currency ||
    price.recurring?.interval !== PLAN.interval ||
    price.recurring.interval_count !== 1 ||
    price.tax_behavior !== "inclusive"
  )
    throw new Error("Le prix doit être 10,99 EUR/mois, taxes incluses, dans l'environnement courant.");
}
