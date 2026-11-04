import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ownerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOwner } = await import("./super-admin.server");
    try { await requireOwner(context.supabase); return true; } catch { return false; }
  });

const listSchema = z.object({
  section: z.enum(["shops", "profiles", "repairs", "estimations", "admin_audit_events", "device_models", "deduction_rules", "shop_prices"]),
  search: z.string().trim().max(100).default(""),
  shopId: z.string().uuid().optional(),
  state: z.enum(["all", "active", "suspended", "archived"]).default("all"),
  page: z.number().int().min(0).max(100000).default(0),
});

export const listGlobalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("./super-admin.server");
    await requireOwner(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const projections = {
      shops: "id,name,address,phone,email,suspended_at,archived_at,created_at",
      profiles: "id,full_name,email,shop_id,suspended_at,created_at,user_roles(role)",
      repairs: "id,reference,shop_id,model,status,total_price,created_at",
      estimations: "id,shop_id,model_name,final_price,is_blocked,created_at",
      admin_audit_events: "id,actor_id,action,target_id,before_data,after_data,created_at",
      device_models: "id,name,brand,base_price,colors,storages,active,created_at",
      deduction_rules: "id,shop_id,name,category,deduction,is_blocking,active,created_at",
      shop_prices: "id,shop_id,model_id,color,storage_gb,base_price,updated_at",
    };
    let query = supabaseAdmin.from(data.section).select(projections[data.section], { count: "exact" });
    const searchColumn = data.section === "profiles" ? "full_name" : data.section === "repairs" ? "reference" : data.section === "estimations" ? "model_name" : "name";
    if (data.search && !["shop_prices", "admin_audit_events"].includes(data.section)) query = query.ilike(searchColumn, `%${data.search.replace(/[%_]/g, "")}%`);
    if (data.shopId && ["profiles", "repairs", "estimations", "deduction_rules", "shop_prices"].includes(data.section)) query = query.eq("shop_id", data.shopId);
    if (["shops", "profiles"].includes(data.section)) {
      if (data.state === "active") query = query.is("suspended_at", null);
      if (data.state === "suspended") query = query.not("suspended_at", "is", null);
      if (data.section === "shops" && data.state === "archived") query = query.not("archived_at", "is", null);
      if (data.section === "shops" && data.state === "active") query = query.is("archived_at", null);
    }
    const result = await query.order(data.section === "shop_prices" ? "updated_at" : "created_at", { ascending: false }).range(data.page * 20, data.page * 20 + 19);
    if (result.error) throw new Error("Chargement impossible.");
    // Dynamic table selection is intentionally projected above; return plain DTOs only.
    return { rows: result.data as unknown as Record<string, unknown>[], count: result.count ?? 0 };
  });

export const globalOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireOwner } = await import("./super-admin.server");
    await requireOwner(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const counts = await Promise.all((["shops", "profiles", "repairs", "estimations"] as const).map(async (table) => {
      const result = await supabaseAdmin.from(table).select("id", { head: true, count: "exact" });
      if (result.error) throw new Error("Chargement impossible.");
      return result.count ?? 0;
    }));
    return counts;
  });

export const updateGlobalEntity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({
    kind: z.enum(["shop", "member"]), targetId: z.string().uuid(),
    changes: z.object({ name: z.string().trim().min(2).max(120).optional(), address: z.string().max(300).nullable().optional(), phone: z.string().max(40).nullable().optional(), email: z.string().email().max(160).nullable().optional(), suspended: z.boolean().optional(), archived: z.boolean().optional(), role: z.enum(["admin", "employee"]).optional() }).strict(),
  }).strict().parse(data))
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("./super-admin.server");
    await requireOwner(context.supabase);
    if (data.kind === "member" && Object.keys(data.changes).some((key) => !["role", "suspended"].includes(key))) throw new Error("Modification non autorisée.");
    if (data.kind === "shop" && "role" in data.changes) throw new Error("Modification non autorisée.");
    const { error } = await context.supabase.rpc("super_admin_mutate", { _kind: data.kind, _target: data.targetId, _changes: data.changes });
    if (error) throw new Error(error.message.includes("Last active") ? "Le dernier administrateur actif doit être conservé." : error.message.includes("Owner") ? "Le propriétaire ne peut pas être désactivé ou modifié." : "Modification refusée.");
    return { ok: true };
  });