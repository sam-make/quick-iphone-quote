import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function requireOwner(client: SupabaseClient<Database>) {
  const { data, error } = await client.auth.getUser();
  if (
    error ||
    !data.user ||
    data.user.email !== "haddaouisamy86@gmail.com" ||
    !data.user.email_confirmed_at
  ) {
    throw new Error("Accès réservé au propriétaire autorisé.");
  }
  const role = await client.rpc("is_super_admin");
  if (role.error || role.data !== true) throw new Error("Accès réservé au propriétaire autorisé.");
  return data.user.id;
}
