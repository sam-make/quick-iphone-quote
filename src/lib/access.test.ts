import { describe, expect, test } from "bun:test";
import {
  ACCESS_ACTIVATION_DATE,
  LEGACY_TRANSITION_END,
  resolveShopAccess,
} from "./access";
import type { SubscriptionState } from "./subscription";

const NOW = Date.parse("2026-11-01T12:00:00.000Z");
const LEGACY_SHOP = "2026-10-20T10:00:00.000Z"; // before activation
const NEW_SHOP = "2026-11-01T09:00:00.000Z"; // after activation
const FUTURE = "2026-11-20T00:00:00.000Z";
const PAST = "2026-10-30T00:00:00.000Z";

function sub(status: string, periodEnd: string | null, cancel = false): SubscriptionState {
  return { status, current_period_end: periodEnd, cancel_at_period_end: cancel };
}

describe("resolveShopAccess — abonnements actifs", () => {
  test("abonnement actif avec période en cours → accès", () => {
    expect(resolveShopAccess(sub("active", FUTURE), NEW_SHOP, NOW)).toEqual({
      allowed: true,
      reason: "subscribed",
    });
  });

  test("période d'essai en cours → accès", () => {
    expect(resolveShopAccess(sub("trialing", FUTURE), NEW_SHOP, NOW).allowed).toBe(true);
  });

  test("paiement échoué (past_due) mais période payée non échue → accès conservé", () => {
    expect(resolveShopAccess(sub("past_due", FUTURE), NEW_SHOP, NOW)).toEqual({
      allowed: true,
      reason: "subscribed",
    });
  });

  test("résiliation : accès conservé jusqu'à la fin de la période payée", () => {
    expect(resolveShopAccess(sub("canceled", FUTURE, true), NEW_SHOP, NOW).allowed).toBe(true);
  });

  test("résiliation : accès refusé une fois la période payée écoulée", () => {
    expect(resolveShopAccess(sub("canceled", PAST, true), NEW_SHOP, NOW)).toEqual({
      allowed: false,
      reason: "subscription_expired",
    });
  });

  test("abonnement expiré (période échue) → refusé", () => {
    expect(resolveShopAccess(sub("active", PAST), NEW_SHOP, NOW).allowed).toBe(false);
  });

  test("abonnement sans fin de période connue → refusé", () => {
    expect(resolveShopAccess(sub("active", null), NEW_SHOP, NOW).allowed).toBe(false);
  });
});

describe("resolveShopAccess — boutiques existantes (transition)", () => {
  test("boutique existante sans abonnement pendant la transition → accès", () => {
    expect(resolveShopAccess(null, LEGACY_SHOP, NOW)).toEqual({
      allowed: true,
      reason: "legacy_transition",
    });
  });

  test("boutique existante après la fin de transition → refusée", () => {
    const after = Date.parse(LEGACY_TRANSITION_END) + 1000;
    expect(resolveShopAccess(null, LEGACY_SHOP, after)).toEqual({
      allowed: false,
      reason: "transition_expired",
    });
  });

  test("boutique existante avec abonnement actif après la transition → accès", () => {
    const after = Date.parse(LEGACY_TRANSITION_END) + 1000;
    expect(
      resolveShopAccess(sub("active", "2026-12-20T00:00:00.000Z"), LEGACY_SHOP, after).allowed,
    ).toBe(true);
  });

  test("boutique créée juste avant l'activation = existante", () => {
    const justBefore = new Date(Date.parse(ACCESS_ACTIVATION_DATE) - 1).toISOString();
    expect(resolveShopAccess(null, justBefore, NOW).allowed).toBe(true);
  });
});

describe("resolveShopAccess — nouveaux comptes", () => {
  test("nouvelle boutique sans abonnement → refusée immédiatement", () => {
    expect(resolveShopAccess(null, NEW_SHOP, NOW)).toEqual({
      allowed: false,
      reason: "no_subscription",
    });
  });

  test("nouvelle boutique créée le jour de l'activation → pas de transition", () => {
    expect(resolveShopAccess(null, ACCESS_ACTIVATION_DATE, NOW).allowed).toBe(false);
  });

  test("nouvelle boutique avec abonnement actif → accès", () => {
    expect(resolveShopAccess(sub("active", FUTURE), NEW_SHOP, NOW).allowed).toBe(true);
  });
});
