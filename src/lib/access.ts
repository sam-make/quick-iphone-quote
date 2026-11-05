import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireBusinessAccess = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("business_access_allowed");
    if (error || data !== true)
      throw new Error("L’accès à votre boutique est suspendu. Contactez le propriétaire.");
    return next();
  });
