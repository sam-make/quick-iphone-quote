import { describe, it, expect } from "vitest";
import { hasSubscriptionAccess, assertPlanPrice, environmentSchema } from "./subscription";
import { eventSubscriptionId, verifyWebhook } from "./payment-webhook.server";
import { createStripeClient } from "./stripe.server";
const now = Date.UTC(2026, 9, 25);
const future = "2026-11-25T00:00:00.000Z";
const past = "2026-10-24T00:00:00.000Z";
const basePrice = {
  unit_amount: 1099,
  currency: "eur",
  recurring: { interval: "month", interval_count: 1 },
  tax_behavior: "inclusive",
};
describe("Stripe plan rules", () => {
  it("accepts only the exact 10.99 EUR monthly price with included tax, per environment", () => {
    expect(() => assertPlanPrice({ ...basePrice, livemode: false }, "sandbox")).not.toThrow();
    expect(() => assertPlanPrice({ ...basePrice, livemode: true }, "live")).not.toThrow();
    for (const change of [
      { unit_amount: 599 },
      { currency: "usd" },
      { recurring: { interval: "year", interval_count: 1 } },
      { tax_behavior: "exclusive" },
    ])
      expect(() => assertPlanPrice({ ...basePrice, livemode: false, ...change }, "sandbox")).toThrow();
  });
  it("rejects a price whose mode does not match the environment", () => {
    expect(() => assertPlanPrice({ ...basePrice, livemode: true }, "sandbox")).toThrow();
    expect(() => assertPlanPrice({ ...basePrice, livemode: false }, "live")).toThrow();
  });
  it("accepts sandbox and live environments, rejects anything else", () => {
    expect(environmentSchema.safeParse("sandbox").success).toBe(true);
    expect(environmentSchema.safeParse("live").success).toBe(true);
    expect(environmentSchema.safeParse("production").success).toBe(false);
  });
  it("preserves paid access until cancellation period ends", () => {
    expect(
      hasSubscriptionAccess(
        { status: "canceled", current_period_end: future, cancel_at_period_end: true },
        now,
      ),
    ).toBe(true);
    expect(
      hasSubscriptionAccess(
        { status: "canceled", current_period_end: past, cancel_at_period_end: true },
        now,
      ),
    ).toBe(false);
  });
  it("never grants access on unpaid or incomplete states", () => {
    for (const status of ["incomplete", "incomplete_expired", "unpaid", "paused"])
      expect(
        hasSubscriptionAccess(
          { status, current_period_end: future, cancel_at_period_end: false },
          now,
        ),
      ).toBe(false);
    expect(
      hasSubscriptionAccess(
        { status: "active", current_period_end: null, cancel_at_period_end: false },
        now,
      ),
    ).toBe(false);
  });
  it("keeps active and retrying access within the paid period only", () => {
    for (const status of ["active", "trialing", "past_due"]) {
      expect(
        hasSubscriptionAccess(
          { status, current_period_end: future, cancel_at_period_end: false },
          now,
        ),
      ).toBe(true);
      expect(
        hasSubscriptionAccess(
          { status, current_period_end: past, cancel_at_period_end: false },
          now,
        ),
      ).toBe(false);
    }
  });
  it("maps lifecycle and invoice notification subscriptions", () => {
    const base = { id: "evt_test", created: 1, livemode: false };
    expect(
      eventSubscriptionId({
        ...base,
        type: "customer.subscription.deleted",
        data: { object: { id: "sub_1" } },
      }),
    ).toBe("sub_1");
    expect(
      eventSubscriptionId({
        ...base,
        type: "invoice.payment_failed",
        data: { object: { parent: { subscription_details: { subscription: "sub_1" } } } },
      }),
    ).toBe("sub_1");
    expect(
      eventSubscriptionId({
        ...base,
        type: "checkout.session.completed",
        data: { object: { subscription: "sub_1", payment_status: "unpaid" } },
      }),
    ).toBe("sub_1");
  });
  it("verifies signed bodies per environment and rejects forged, expired and mismatched notifications", async () => {
    const secret = "whsec_unit_test_only";
    const liveSecret = "whsec_unit_test_live";
    const saved: Record<string, string | undefined> = {};
    for (const key of [
      "PAYMENTS_SANDBOX_WEBHOOK_SECRET",
      "PAYMENTS_LIVE_WEBHOOK_SECRET",
      "STRIPE_SANDBOX_API_KEY",
      "STRIPE_LIVE_API_KEY",
      "LOVABLE_API_KEY",
    ]) {
      saved[key] = process.env[key];
      process.env[key] = key.includes("WEBHOOK")
        ? key.includes("LIVE")
          ? liveSecret
          : secret
        : "test";
    }
    try {
      const body = (livemode: boolean) =>
        JSON.stringify({
          id: "evt_test",
          type: "customer.subscription.updated",
          created: 1,
          livemode,
          data: { object: { id: "sub_1" } },
        });
      const req = (text: string, sig: string) =>
        new Request("https://example.test", {
          method: "POST",
          body: text,
          headers: { "stripe-signature": sig },
        });
      const sign = (payload: string, sec: string, timestamp?: number) =>
        createStripeClient("sandbox").webhooks.generateTestHeaderString({
          payload,
          secret: sec,
          ...(timestamp ? { timestamp } : {}),
        });
      // Sandbox: signed test event accepted.
      const testBody = body(false);
      expect((await verifyWebhook(req(testBody, sign(testBody, secret)), "sandbox")).id).toBe(
        "evt_test",
      );
      // Live: signed live event accepted with the live secret.
      const liveBody = body(true);
      expect((await verifyWebhook(req(liveBody, sign(liveBody, liveSecret)), "live")).id).toBe(
        "evt_test",
      );
      // Tampered body rejected.
      await expect(
        verifyWebhook(req(testBody + " ", sign(testBody, secret)), "sandbox"),
      ).rejects.toThrow();
      // Expired timestamp rejected.
      await expect(
        verifyWebhook(req(testBody, sign(testBody, secret, 1)), "sandbox"),
      ).rejects.toThrow();
      // Cross-environment events rejected both ways.
      await expect(
        verifyWebhook(req(liveBody, sign(liveBody, liveSecret)), "sandbox"),
      ).rejects.toThrow();
      await expect(
        verifyWebhook(req(testBody, sign(testBody, secret)), "live"),
      ).rejects.toThrow();
    } finally {
      for (const [key, val] of Object.entries(saved)) {
        if (val === undefined) delete process.env[key];
        else process.env[key] = val;
      }
    }
  });
});
