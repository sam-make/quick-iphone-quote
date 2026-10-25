import { hasSubscriptionAccess, type SubscriptionState } from "./subscription";

/**
 * Subscription access rule, shared by the server gate (access.server.ts) and
 * the UI banners. Mirrors public.shop_has_access in the database — any change
 * here must be reflected there.
 *
 * Rule:
 * - active / trialing / past_due / canceled subscription with a future period
 *   end → access (failed payments keep access during the paid period while
 *   Stripe retries; cancellation keeps access until the end of the paid period).
 * - Legacy shops (created before ACCESS_ACTIVATION_DATE) keep access during a
 *   30-day transition window ending at LEGACY_TRANSITION_END, then must subscribe.
 * - Everyone else → denied.
 */
export const ACCESS_ACTIVATION_DATE = "2026-10-26T00:00:00.000Z";
export const LEGACY_TRANSITION_END = "2026-11-25T00:00:00.000Z";

export type ShopAccess =
  | { allowed: true; reason: "subscribed" | "legacy_transition" }
  | { allowed: false; reason: "no_subscription" | "subscription_expired" | "transition_expired" };

export function resolveShopAccess(
  subscription: SubscriptionState | null,
  shopCreatedAt: string,
  now: number = Date.now(),
): ShopAccess {
  if (hasSubscriptionAccess(subscription, now)) {
    return { allowed: true, reason: "subscribed" };
  }
  const isLegacy = Date.parse(shopCreatedAt) < Date.parse(ACCESS_ACTIVATION_DATE);
  if (isLegacy && now < Date.parse(LEGACY_TRANSITION_END)) {
    return { allowed: true, reason: "legacy_transition" };
  }
  if (isLegacy) return { allowed: false, reason: "transition_expired" };
  if (subscription) return { allowed: false, reason: "subscription_expired" };
  return { allowed: false, reason: "no_subscription" };
}

export const ACCESS_DENIED_MESSAGE =
  "Abonnement inactif : souscrivez à l’offre Trade-In Pro (10,99 €/mois) depuis la page Abonnement pour continuer à utiliser cette fonctionnalité.";
