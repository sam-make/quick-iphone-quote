import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analyticsInput, analyticsResult } from "./owner-analytics";

export const getOwnerAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => analyticsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { requireOwner } = await import("./super-admin.server");
    await requireOwner(context.supabase);
    const result = await context.supabase.rpc("owner_analytics", {
      _days: data.days, ... (data.shopId ? { _shop: data.shopId } : {}),
    });
    if (result.error) throw new Error("Impossible de charger les statistiques.");
    return analyticsResult.parse(result.data);
  });

export const recordShopPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const result = await context.supabase.rpc("record_shop_presence");
    if (result.error) return { recorded: false };
    return { recorded: true };
  });