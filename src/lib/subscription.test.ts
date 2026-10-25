import { describe, it, expect } from "vitest";
import { hasSubscriptionAccess, assertTestPrice, testEnvironmentSchema } from "./subscription";
import { eventSubscriptionId, verifyTestWebhook } from "./payment-webhook.server";
import { createStripeClient } from "./stripe.server";
const now = Date.UTC(2026, 9, 25);
const future = "2026-11-25T00:00:00.000Z";
const past = "2026-10-24T00:00:00.000Z";
describe("Stripe test rules", () => {
  it("accepts only the exact 10.99 EUR monthly test price with included tax", () => {
    const price = {
      unit_amount: 1099,
      currency: "eur",
      livemode: false,
      recurring: { interval: "month", interval_count: 1 },
      tax_behavior: "inclusive",
    };
    expect(() => assertTestPrice(price)).not.toThrow();
    for (const change of [
      { unit_amount: 599 },
      { currency: "usd" },
      { livemode: true },
      { recurring: { interval: "year", interval_count: 1 } },
      { tax_behavior: "exclusive" },
    ])
      expect(() => assertTestPrice({ ...price, ...change })).toThrow();
  });
  it("rejects live requests", () => {
    expect(testEnvironmentSchema.safeParse("live").success).toBe(false);
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
    const base = { id: "evt_test", created: 1, livemode: false as const };
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
  it("verifies signed bodies and rejects forged, expired and live notifications", async () => {
    const secret = "whsec_unit_test_only";
    const saved = process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"];
    process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"] = secret;
    const oldConnection = process.env["STRIPE_SANDBOX_API_KEY"],
      oldLovable = process.env["LOVABLE_API_KEY"];
    process.env["STRIPE_SANDBOX_API_KEY"] = "test";
    process.env["LOVABLE_API_KEY"] = "test";
    try {
      const stripe = createStripeClient("sandbox");
      const body = JSON.stringify({
        id: "evt_test",
        type: "customer.subscription.updated",
        created: 1,
        livemode: false,
        data: { object: { id: "sub_1" } },
      });
      const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });
      const req = (text = body, sig = signature) =>
        new Request("https://example.test", {
          method: "POST",
          body: text,
          headers: { "stripe-signature": sig },
        });
      expect((await verifyTestWebhook(req())).id).toBe("evt_test");
      await expect(verifyTestWebhook(req(body + " "))).rejects.toThrow();
      await expect(
        verifyTestWebhook(
          req(
            body,
            stripe.webhooks.generateTestHeaderString({ payload: body, secret, timestamp: 1 }),
          ),
        ),
      ).rejects.toThrow();
      const live = body.replace('"livemode":false', '"livemode":true');
      await expect(
        verifyTestWebhook(
          req(live, stripe.webhooks.generateTestHeaderString({ payload: live, secret })),
        ),
      ).rejects.toThrow();
    } finally {
      for (const [key, val] of [
        ["PAYMENTS_SANDBOX_WEBHOOK_SECRET", saved],
        ["STRIPE_SANDBOX_API_KEY", oldConnection],
        ["LOVABLE_API_KEY", oldLovable],
      ]) {
        if (val === undefined) delete process.env[key as string];
        else process.env[key as string] = val;
      }
    }
  });
});
