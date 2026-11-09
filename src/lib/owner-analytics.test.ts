import { describe, expect, it } from "vitest";
import { analyticsInput, inactivityDays, isInactive, rankShops, usageFrequency, type AnalyticsShop } from "./owner-analytics";
const now = "2026-11-09T18:00:00Z";
describe("owner analytics rules", () => {
  it.each([7,14,30])("detects inactivity at %i full days, not before", (days) => {
    const date = new Date(Date.parse(now) - days * 86_400_000).toISOString();
    expect(isInactive(date, now, days)).toBe(true);
    expect(isInactive(new Date(Date.parse(date)+1).toISOString(), now, days)).toBe(false);
  });
  it("keeps never observed separate from known inactivity", () => {
    expect(inactivityDays(null, now)).toBeNull();
    expect(isInactive(null, now, 7)).toBe(false);
  });
  it("accepts only requested 7, 30 and 90 day periods", () => {
    for (const days of [7,30,90]) expect(analyticsInput.parse({days}).days).toBe(days);
    expect(analyticsInput.safeParse({days:14}).success).toBe(false);
  });
  it("computes frequency as observed active days per week", () => {
    expect(usageFrequency(3,7)).toBe(3);
    expect(usageFrequency(15,30)).toBe(3.5);
  });
  it("ranks by estimates or frequency without changing source rows", () => {
    const base = {created_at: now,suspended_at:null,archived_at:null,last_login:null,last_activity:null,estimations:0,repairs:0,customers:0,estimates_today:0,estimates_week:0,estimates_month:0,presence_days:0};
    const shops: AnalyticsShop[] = [{...base,id:"a",name:"A",period_estimates:4,active_days:1},{...base,id:"b",name:"B",period_estimates:2,active_days:5}];
    expect(rankShops(shops,"estimates").map(s=>s.id)).toEqual(["a","b"]);
    expect(rankShops(shops,"frequency").map(s=>s.id)).toEqual(["b","a"]);
    expect(shops[0].id).toBe("a");
  });
});