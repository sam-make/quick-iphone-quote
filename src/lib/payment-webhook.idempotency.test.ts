import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Duplicate, out-of-order and replayed Stripe notifications.
 *
 * Stripe is faked (state re-read by processEvent) and the database RPC is a
 * faithful in-memory model of `apply_subscription_event`: an event id is
 * applied once, and a row is only overwritten by an event created at or after
 * the last applied one. The real SQL function was also exercised separately.
 */
const SHOP = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const future = Math.floor(Date.UTC(2026, 11, 25) / 1000);

let stripeSub: { status: string; cancel_at_period_end: boolean };
const rpcCalls: Record<string, unknown>[] = [];
const seenEvents = new Set<string>();
const rows = new Map<string, { status: string; cancel: boolean; last: number }>();

vi.mock("./stripe.server", () => ({
  createStripeClient: () => ({
    subscriptions: {
      retrieve: async (id: string) => ({
        id,
        status: stripeSub.status,
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        customer: "cus_1",
        metadata: { userId: USER, shopId: SHOP },
        items: {
          data: [
            {
              quantity: 1,
              current_period_end: future,
              price: {
                lookup_key: "trade_in_pro_monthly",
                unit_amount: 1099,
                currency: "eur",
                livemode: false,
                recurring: { interval: "month", interval_count: 1 },
                tax_behavior: "inclusive",
              },
            },
          ],
        },
      }),
    },
    customers: { retrieve: async () => ({ id: "cus_1", metadata: { userId: USER } }) },
  }),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (_name: string, p: Record<string, any>) => {
      rpcCalls.push(p);
      const key = `${p.p_environment}:${p.p_event_id}`;
      if (seenEvents.has(key)) return { data: false, error: null };
      const row = rows.get(p.p_subscription_id);
      if (!row || row.last <= p.p_event_created)
        rows.set(p.p_subscription_id, { status: p.p_status, cancel: p.p_cancel, last: p.p_event_created });
      seenEvents.add(key);
      return { data: true, error: null };
    },
  },
}));

const { processEvent } = await import("./payment-webhook.server");

const event = (id: string, created: number, type = "customer.subscription.updated") => ({
  id,
  type,
  created,
  livemode: false,
  data: { object: { id: "sub_1" } },
});

beforeEach(() => {
  rpcCalls.length = 0;
  seenEvents.clear();
  rows.clear();
  stripeSub = { status: "active", cancel_at_period_end: false };
});

describe("Stripe webhook idempotency", () => {
  it("applies a duplicated notification only once", async () => {
    expect(await processEvent(event("evt_a", 100), "sandbox")).toEqual({ processed: true });
    expect(await processEvent(event("evt_a", 100), "sandbox")).toEqual({ processed: false });
    expect(rows.get("sub_1")).toEqual({ status: "active", cancel: false, last: 100 });
    // Same event id passed both times so the database can deduplicate it.
    expect(rpcCalls.map((c) => c.p_event_id)).toEqual(["evt_a", "evt_a"]);
  });

  it("an older notification received late never overwrites newer state", async () => {
    stripeSub = { status: "active", cancel_at_period_end: true };
    await processEvent(event("evt_new", 200), "sandbox");
    // Late delivery of an earlier event: state is re-read from Stripe and the
    // older creation time is passed, so the newer row is kept.
    await processEvent(event("evt_old", 150), "sandbox");
    expect(rpcCalls[1].p_event_created).toBe(150);
    expect(rows.get("sub_1")).toEqual({ status: "active", cancel: true, last: 200 });
  });

  it("uses current Stripe state rather than the event payload", async () => {
    stripeSub = { status: "canceled", cancel_at_period_end: false };
    await processEvent(event("evt_c", 300, "invoice.paid"), "sandbox");
    expect(rpcCalls[0].p_status).toBe("canceled");
  });

  it("a replayed notification after later events changes nothing", async () => {
    await processEvent(event("evt_1", 100), "sandbox");
    stripeSub = { status: "past_due", cancel_at_period_end: false };
    await processEvent(event("evt_2", 200), "sandbox");
    stripeSub = { status: "active", cancel_at_period_end: false };
    expect(await processEvent(event("evt_1", 100), "sandbox")).toEqual({ processed: false });
    expect(rows.get("sub_1")?.status).toBe("past_due");
  });

  it("deduplication is scoped per environment", async () => {
    await processEvent(event("evt_x", 100), "sandbox");
    expect(rpcCalls[0].p_environment).toBe("sandbox");
  });

  it("ignores events with no subscription without writing", async () => {
    const res = await processEvent(
      { ...event("evt_n", 1, "checkout.session.completed"), data: { object: {} } },
      "sandbox",
    );
    expect(res).toEqual({ ignored: true });
    expect(rpcCalls).toHaveLength(0);
  });
});
