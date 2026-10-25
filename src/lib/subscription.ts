import { z } from 'zod';
export const TEST_PLAN = { priceId: 'trade_in_pro_monthly', amount: 1099, currency: 'eur', interval: 'month' } as const;
export const testEnvironmentSchema = z.literal('sandbox');
export const subscriptionStatusSchema = z.enum(['active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid','paused']);
export type SubscriptionState = { status: string; current_period_end: string | null; cancel_at_period_end: boolean };
export function hasSubscriptionAccess(sub: SubscriptionState | null, now = Date.now()): boolean {
  if (!sub?.current_period_end || Date.parse(sub.current_period_end) <= now) return false;
  return ['active', 'trialing', 'past_due', 'canceled'].includes(sub.status);
}
export function assertTestPrice(price: {unit_amount: number | null; currency: string; livemode: boolean; recurring: {interval: string; interval_count: number} | null; tax_behavior?: string | null}) {
  if (price.livemode || price.unit_amount !== TEST_PLAN.amount || price.currency !== TEST_PLAN.currency || price.recurring?.interval !== TEST_PLAN.interval || price.recurring.interval_count !== 1 || price.tax_behavior !== 'inclusive') throw new Error('Le prix doit être 10,99 EUR/mois, taxes incluses, en test uniquement.');
}
