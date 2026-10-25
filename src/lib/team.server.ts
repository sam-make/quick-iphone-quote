/**
 * Server-only helpers for shop settings and team (employee) management.
 * Only reachable through `team.functions.ts` handlers.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyClient = SupabaseClient<any, any, any>;

export interface ShopSettingsInput {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Member {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "employee";
  created_at: string;
}

/** Returns the caller's shop id, asserting the admin role. */
export async function requireAdminShop(supabase: AnyClient, userId: string): Promise<string> {
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Action réservée à l'administrateur de la boutique.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("shop_id")
    .eq("id", userId)
    .single();
  if (profileError || !profile) throw new Error("Profil boutique introuvable.");
  return profile.shop_id as string;
}

export async function saveShopSettings(
  supabase: AnyClient,
  userId: string,
  input: ShopSettingsInput,
) {
  const shopId = await requireAdminShop(supabase, userId);
  const { data, error } = await supabase
    .from("shops")
    .update({
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .eq("id", shopId)
    .select("id, name, address, phone, email")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listMembers(supabase: AnyClient, userId: string): Promise<Member[]> {
  const shopId = await requireAdminShop(supabase, userId);
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .eq("shop_id", shopId)
    .order("created_at");
  if (error) throw new Error(error.message);

  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("shop_id", shopId);
  const roleFor = new Map(
    (roles ?? []).map((row: any) => [row.user_id as string, row.role as "admin" | "employee"]),
  );

  return (profiles ?? []).map((row: any) => ({
    id: row.id as string,
    full_name: row.full_name as string,
    email: (row.email ?? null) as string | null,
    role: roleFor.get(row.id as string) ?? "employee",
    created_at: row.created_at as string,
  }));
}

export async function inviteMember(
  supabase: AnyClient,
  admin: AnyClient,
  userId: string,
  input: { email: string; fullName: string; role: "admin" | "employee"; redirectTo: string },
) {
  const shopId = await requireAdminShop(supabase, userId);

  const { data, error } = await (admin as any).auth.admin.inviteUserByEmail(input.email.trim(), {
    redirectTo: input.redirectTo,
    data: { full_name: input.fullName.trim() },
  });
  if (error) throw new Error(error.message);

  const invited = data?.user;
  if (!invited?.id) throw new Error("L'invitation n'a pas retourné d'utilisateur.");
  if (!invited.invited_at || invited.email?.toLowerCase() !== input.email.trim().toLowerCase()) {
    throw new Error("Invitation non valide.");
  }
  const { data: existing, error: existingError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", invited.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) throw new Error("Cet utilisateur est déjà rattaché à une boutique.");

  // Le rattachement à la boutique et le rôle sont écrits ici, côté serveur,
  // AVANT la première connexion de l'invité. ensureWorkspaceFor ne fait
  // confiance qu'à ces lignes — jamais aux métadonnées utilisateur.
  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.id,
    shop_id: shopId,
    full_name: input.fullName.trim() || input.email.trim(),
    email: input.email.trim(),
  });
  if (profileError) throw new Error(`Invitation impossible (profil) : ${profileError.message}`);

  const { error: roleError } = await admin
    .from("user_roles")
    .insert({ user_id: invited.id, shop_id: shopId, role: input.role });
  if (roleError) {
    // Évite un état incohérent (profil rattaché sans rôle) : on retire le profil.
    await admin.from("profiles").delete().eq("id", invited.id).eq("shop_id", shopId);
    throw new Error(`Invitation impossible (rôle) : ${roleError.message}`);
  }
  return { ok: true as const };
}

export async function setMemberRole(
  supabase: AnyClient,
  admin: AnyClient,
  userId: string,
  input: { memberId: string; role: "admin" | "employee" },
) {
  const shopId = await requireAdminShop(supabase, userId);
  if (input.memberId === userId) throw new Error("Vous ne pouvez pas modifier votre propre rôle.");

  const { data: member } = await admin
    .from("profiles")
    .select("id")
    .eq("id", input.memberId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!member) throw new Error("Employé introuvable dans cette boutique.");

  await admin.from("user_roles").delete().eq("user_id", input.memberId).eq("shop_id", shopId);
  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: input.memberId, shop_id: shopId, role: input.role });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function removeMember(
  supabase: AnyClient,
  admin: AnyClient,
  userId: string,
  memberId: string,
) {
  const shopId = await requireAdminShop(supabase, userId);
  if (memberId === userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte.");

  const { data: member } = await admin
    .from("profiles")
    .select("id")
    .eq("id", memberId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (!member) throw new Error("Employé introuvable dans cette boutique.");

  await admin.from("user_roles").delete().eq("user_id", memberId).eq("shop_id", shopId);
  await admin.from("profiles").delete().eq("id", memberId).eq("shop_id", shopId);
  await (admin as any).auth.admin.deleteUser(memberId);
  return { ok: true as const };
}
