import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const shopSchema = z.object({
  name: z.string().min(2).max(120),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(160).nullable().optional().or(z.literal("")),
});

const inviteSchema = z.object({
  email: z.string().email().max(160),
  fullName: z.string().min(2).max(120),
  role: z.enum(["admin", "employee"]),
  redirectTo: z.string().url().max(300),
});

const roleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "employee"]),
});

export const updateShopSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => shopSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { saveShopSettings } = await import("./team.server");
    return saveShopSettings(context.supabase, context.userId, {
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email || null,
    });
  });

export const fetchMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listMembers } = await import("./team.server");
    return listMembers(context.supabase, context.userId);
  });

export const inviteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { inviteMember } = await import("./team.server");
    return inviteMember(context.supabase, supabaseAdmin, context.userId, data);
  });

export const changeEmployeeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { setMemberRole } = await import("./team.server");
    return setMemberRole(context.supabase, supabaseAdmin, context.userId, data);
  });

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ memberId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { removeMember } = await import("./team.server");
    return removeMember(context.supabase, supabaseAdmin, context.userId, data.memberId);
  });
