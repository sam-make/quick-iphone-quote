import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REPAIR_STATUSES } from "./repairs";

const customerSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  firstName: z.string().trim().max(80).default(""),
  lastName: z.string().trim().max(80).default(""),
  phone: z.string().trim().min(4).max(30),
  email: z.string().trim().max(255).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const repairSchema = z.object({
  customer: customerSchema,
  device: z.object({
    id: z.string().uuid().optional().nullable(),
    brand: z.string().trim().min(1).max(60),
    model: z.string().trim().min(1).max(80),
    color: z.string().trim().max(60).optional().nullable(),
    storage: z.string().trim().max(30).optional().nullable(),
    imei: z.string().trim().max(30).optional().nullable(),
    unlockCode: z.string().trim().max(40).optional().nullable(),
  }),
  condition: z.string().trim().max(300).optional().nullable(),
  issue: z.string().trim().max(2000).default(""),
  services: z
    .array(
      z.object({
        serviceId: z.string().uuid().optional().nullable(),
        name: z.string().trim().max(120).optional().nullable(),
        unitPrice: z.number().min(0).max(100000).optional().nullable(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
});

const statusSchema = z.object({
  repairId: z.string().uuid(),
  status: z.enum(REPAIR_STATUSES),
  comment: z.string().trim().max(500).optional().nullable(),
});

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => customerSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { upsertCustomerFor } = await import("./repairs.server");
    return upsertCustomerFor(context.supabase, context.userId, data);
  });

export const createRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => repairSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { createRepairFor } = await import("./repairs.server");
    return createRepairFor(context.supabase, context.userId, data);
  });

export const changeRepairStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { changeStatusFor } = await import("./repairs.server");
    return changeStatusFor(context.supabase, context.userId, data.repairId, data.status, data.comment);
  });

export const generateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ repairId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateInvoiceFor } = await import("./repairs.server");
    return generateInvoiceFor(context.supabase, supabaseAdmin, context.userId, data.repairId);
  });
