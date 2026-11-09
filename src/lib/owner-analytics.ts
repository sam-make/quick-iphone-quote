import { z } from "zod";

export const analyticsInput = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  shopId: z.string().uuid().optional(),
});
export const analyticsResult = z.object({
  now: z.string(),
  tracking_since: z.string(),
  shops: z.array(z.object({
    id: z.string(), name: z.string(), created_at: z.string(),
    suspended_at: z.string().nullable(), archived_at: z.string().nullable(),
    last_login: z.string().nullable(), last_activity: z.string().nullable(),
    estimations: z.number(), repairs: z.number(), customers: z.number(),
    estimates_today: z.number(), estimates_week: z.number(), estimates_month: z.number(),
    period_estimates: z.number(), active_days: z.number(), presence_days: z.number(),
  })),
  trend: z.array(z.object({ date: z.string(), estimations: z.number(), repairs: z.number(), customers: z.number() })),
  history: z.array(z.object({ shop_id: z.string(), kind: z.string(), occurred_at: z.string() })),
});
export type AnalyticsData = z.infer<typeof analyticsResult>;
export type AnalyticsShop = AnalyticsData["shops"][number];

export function inactivityDays(lastActivity: string | null, now: string): number | null {
  if (!lastActivity) return null;
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(lastActivity)) / 86_400_000));
}
export function isInactive(lastActivity: string | null, now: string, threshold: number): boolean {
  const days = inactivityDays(lastActivity, now);
  return days !== null && days >= threshold;
}
export function rankShops(shops: AnalyticsShop[], sort: "estimates" | "frequency") {
  return [...shops].sort((a,b) => sort === "estimates"
    ? b.period_estimates - a.period_estimates || b.active_days - a.active_days || a.name.localeCompare(b.name)
    : b.active_days - a.active_days || b.period_estimates - a.period_estimates || a.name.localeCompare(b.name));
}
export function usageFrequency(activeDays: number, days: number) {
  return Math.round(activeDays / days * 7 * 10) / 10;
}