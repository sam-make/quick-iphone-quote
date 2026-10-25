/**
 * Server-only subscription gate. Every mutating business server function must
 * call requireShopAccess before writing — the browser alone never decides access.
 * The same rule is enforced in the database by public.shop_has_access for the
 * tables that still accept direct writes (repair_services, deduction_rules,
 * shop_prices, estimation_market_analyses).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACCESS_DENIED_MESSAGE,
  accessEnvironmentFromToken,
  pickSubscriptionForEnvironment,
  resolveShopAccess,
  type ShopAccess,
} from "./access";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

export async function getShopAccess(
  supabase: AnyClient,
  userId: string,
): Promise<{ shopId: string; access: ShopAccess }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", userId)
    .single();
  if (error || !profile) throw new Error("Profil boutique introuvable.");

  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("created_at")
    .eq("id", profile.shop_id)
    .single();
  if (shopError || !shop) throw new Error("Boutique introuvable.");

  // Test (aperçu) et réel (production) sont strictement séparés : seul
  // l'environnement de ce build compte. Même règle que shop_has_access(shop, env).
  const environment = accessEnvironmentFromToken(import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN);
  const { data: subs, error: subError } = await supabase
    .from("shop_subscriptions")
    .select("environment,status,current_period_end,cancel_at_period_end")
    .eq("shop_id", profile.shop_id)
    .eq("environment", environment)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (subError) throw new Error(subError.message);

  return {
    shopId: profile.shop_id as string,
    access: resolveShopAccess(
      pickSubscriptionForEnvironment(subs, environment),
      shop.created_at as string,
    ),
  };
}

/** Returns the caller's shop id, or throws when the shop has no access. */
export async function requireShopAccess(supabase: AnyClient, userId: string): Promise<string> {
  const { shopId, access } = await getShopAccess(supabase, userId);
  if (!access.allowed) throw new Error(ACCESS_DENIED_MESSAGE);
  return shopId;
}
