import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireOwner } from "./super-admin.server";

function client(email: string | undefined, confirmed: string | undefined, role: boolean) {
  const rpc = vi.fn(async () => ({ data: role, error: null }));
  const value = { auth: { getUser: async () => ({ data: { user: { id: "owner-id", email, email_confirmed_at: confirmed, user_metadata: { role: "super_admin" } } }, error: null }) }, rpc };
  return { value: value as unknown as SupabaseClient<Database>, rpc };
}
describe("global owner authorization", () => {
  it("accepts only the verified authorized owner with protected role", async () => {
    const c = client("haddaouisamy86@gmail.com", "2026-08-16", true);
    expect(await requireOwner(c.value)).toBe("owner-id");
    expect(c.rpc).toHaveBeenCalledWith("is_super_admin");
  });
  it("rejects a different email despite forged metadata and a role", async () => {
    const c = client("shop@example.com", "2026-08-16", true);
    await expect(requireOwner(c.value)).rejects.toThrow("réservé");
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it("rejects the authorized email when not confirmed", async () => {
    await expect(requireOwner(client("haddaouisamy86@gmail.com", undefined, true).value)).rejects.toThrow("réservé");
  });
  it("rejects a verified owner without protected global role", async () => {
    await expect(requireOwner(client("haddaouisamy86@gmail.com", "2026-08-16", false).value)).rejects.toThrow("réservé");
  });
  it("rejects an absent authenticated user", async () => {
    const value = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as unknown as SupabaseClient<Database>;
    await expect(requireOwner(value)).rejects.toThrow("réservé");
  });
});