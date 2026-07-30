/**
 * Server-only helpers for shop (tenant) provisioning and estimation pricing.
 * Never imported from the client bundle directly — only through
 * `workspace.functions.ts` handlers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { computePrice, storageStep, type DeductionRule } from "./pricing";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

export interface WorkspaceSignupInput {
  shopName: string;
  address?: string | null;
  phone?: string | null;
  shopEmail?: string | null;
  adminName?: string | null;
}

export interface WorkspaceSnapshot {
  shop: { id: string; name: string; address: string | null; phone: string | null; email: string | null };
  profile: { id: string; full_name: string; email: string | null };
  role: "admin" | "employee";
}

/**
 * Idempotently creates the tenant for a freshly signed-up user:
 * shop -> profile -> admin role -> default deduction rules.
 */
export async function ensureWorkspaceFor(
  admin: AnyClient,
  userId: string,
  userEmail: string | null,
  metadata: Record<string, unknown>,
): Promise<WorkspaceSnapshot> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, full_name, email, shop_id")
    .eq("id", userId)
    .maybeSingle();

  let shopId = existing?.shop_id as string | undefined;

  if (!shopId) {
    const shopName = (metadata.shop_name as string) || "Ma boutique";
    const { data: shop, error: shopError } = await admin
      .from("shops")
      .insert({
        name: shopName,
        address: (metadata.shop_address as string) ?? null,
        phone: (metadata.shop_phone as string) ?? null,
        email: (metadata.shop_email as string) ?? userEmail,
      })
      .select("id")
      .single();
    if (shopError) throw new Error(shopError.message);
    shopId = shop.id as string;

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      shop_id: shopId,
      full_name: (metadata.full_name as string) || userEmail || "Administrateur",
      email: userEmail,
    });
    if (profileError) throw new Error(profileError.message);

    await admin.from("user_roles").insert({ user_id: userId, shop_id: shopId, role: "admin" });
    await admin.rpc("seed_default_rules", { _shop_id: shopId });
  }

  const { data: shop, error } = await admin
    .from("shops")
    .select("id, name, address, phone, email")
    .eq("id", shopId)
    .single();
  if (error) throw new Error(error.message);

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", userId)
    .single();

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    shop: shop as WorkspaceSnapshot["shop"],
    profile: (profile ?? { id: userId, full_name: "", email: userEmail }) as WorkspaceSnapshot["profile"],
    role: ((roleRow?.role as "admin" | "employee") ?? "employee"),
  };
}

export interface EstimationInput {
  modelId: string;
  color: string;
  storageGb: number;
  imei?: string | null;
  ruleIds: string[];
  notes?: string | null;
}

/**
 * Recomputes the price server-side (never trusting the browser) and persists
 * the estimation plus its defect lines.
 */
export async function saveEstimation(supabase: AnyClient, userId: string, input: EstimationInput) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("shop_id, full_name")
    .eq("id", userId)
    .single();
  if (profileError || !profile) throw new Error("Profil boutique introuvable.");

  const { data: model, error: modelError } = await supabase
    .from("device_models")
    .select("id, name, base_price, colors, storages")
    .eq("id", input.modelId)
    .single();
  if (modelError || !model) throw new Error("Modèle introuvable.");

  if (!model.colors.includes(input.color) || !model.storages.includes(input.storageGb)) {
    throw new Error("Combinaison couleur / stockage invalide pour ce modèle.");
  }

  const { data: overrides } = await supabase
    .from("shop_prices")
    .select("color, base_price")
    .eq("shop_id", profile.shop_id)
    .eq("model_id", input.modelId)
    .eq("storage_gb", input.storageGb)
    .in("color", [input.color, "*"]);

  const exact = overrides?.find((row: { color: string }) => row.color === input.color);
  const wildcard = overrides?.find((row: { color: string }) => row.color === "*");
  const basePrice = Number(
    exact?.base_price ?? wildcard?.base_price ?? Number(model.base_price) + storageStep(input.storageGb),
  );

  let rules: DeductionRule[] = [];
  if (input.ruleIds.length > 0) {
    const { data } = await supabase
      .from("deduction_rules")
      .select("id, name, category, deduction, is_blocking, active, sort_order")
      .eq("shop_id", profile.shop_id)
      .eq("active", true)
      .in("id", input.ruleIds);
    rules = (data ?? []) as DeductionRule[];
  }

  const breakdown = computePrice(basePrice, rules);

  const { data: estimation, error: insertError } = await supabase
    .from("estimations")
    .insert({
      shop_id: profile.shop_id,
      user_id: userId,
      employee_name: profile.full_name,
      model_id: model.id,
      model_name: model.name,
      color: input.color,
      storage_gb: input.storageGb,
      imei: input.imei?.trim() || null,
      base_price: breakdown.basePrice,
      total_deduction: breakdown.totalDeduction,
      final_price: breakdown.finalPrice,
      is_blocked: breakdown.isBlocked,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  if (rules.length > 0) {
    await supabase.from("estimation_defects").insert(
      rules.map((rule) => ({
        estimation_id: estimation.id,
        rule_id: rule.id,
        rule_name: rule.name,
        category: rule.category,
        deduction: rule.deduction,
        is_blocking: rule.is_blocking,
      })),
    );
  }

  return { id: estimation.id as string, ...breakdown };
}