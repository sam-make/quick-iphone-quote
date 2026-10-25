import { describe, expect, it } from "vitest";
import { ensureWorkspaceFor } from "./workspace.server";
import { inviteMember } from "./team.server";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Result = { data: unknown; error: { message: string } | null };
const ok = (data: unknown): Result => ({ data, error: null });
const ko = (message: string): Result => ({ data: null, error: { message } });

interface TableResponses {
  maybeSingle?: Result;
  single?: Result;
  write?: Result;
}

/** Minimal chainable mock of the Supabase client, recording writes. */
function mockClient(responses: Record<string, TableResponses>) {
  const calls: { table: string; method: string; payload?: unknown }[] = [];
  const client: any = {
    from(table: string) {
      const res = responses[table] ?? {};
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = () => chain;
      chain.maybeSingle = async () => res.maybeSingle ?? ok(null);
      chain.single = async () => res.single ?? ok(null);
      chain.insert = (payload: unknown) => {
        calls.push({ table, method: "insert", payload });
        return Object.assign(Promise.resolve(res.write ?? ok(null)), chain);
      };
      chain.upsert = (payload: unknown) => {
        calls.push({ table, method: "upsert", payload });
        return Object.assign(Promise.resolve(res.write ?? ok(null)), chain);
      };
      chain.delete = () => {
        calls.push({ table, method: "delete" });
        return Object.assign(Promise.resolve(res.write ?? ok(null)), chain);
      };
      return chain;
    },
    rpc: async () => ok(null),
  };
  return { client, calls };
}

const SHOP = { id: "shop-new", name: "Ma boutique", address: null, phone: null, email: null };

describe("ensureWorkspaceFor — métadonnées utilisateur jamais dignes de confiance", () => {
  it("ignore invited_shop_id / invited_role falsifiés et crée une boutique propre", async () => {
    const { client, calls } = mockClient({
      profiles: {
        maybeSingle: ok(null),
        single: ok({ id: "user-1", full_name: "Patron", email: "p@x.fr" }),
      },
      shops: { single: ok(SHOP) },
      user_roles: { maybeSingle: ok({ role: "admin" }) },
    });

    const result = await ensureWorkspaceFor(client, "user-1", "p@x.fr", {
      invited_shop_id: "shop-victime",
      invited_role: "admin",
      shop_name: "Ma boutique",
    });

    // Une nouvelle boutique a été créée pour l'utilisateur…
    expect(calls.some((c) => c.table === "shops" && c.method === "insert")).toBe(true);
    // …et aucune écriture ne l'a rattaché à la boutique visée par la falsification.
    const attaches = calls.filter(
      (c) =>
        (c.table === "profiles" || c.table === "user_roles") &&
        (c.method === "insert" || c.method === "upsert") &&
        (c.payload as any)?.shop_id === "shop-victime",
    );
    expect(attaches).toEqual([]);
    expect(result.shop.id).toBe("shop-new");
    expect(result.role).toBe("admin");
  });

  it("réutilise le profil/rôle pré-écrit côté serveur par inviteMember", async () => {
    const { client, calls } = mockClient({
      profiles: {
        maybeSingle: ok({ id: "user-2", full_name: "Employé", email: "e@x.fr", shop_id: "shop-A" }),
        single: ok({ id: "user-2", full_name: "Employé", email: "e@x.fr" }),
      },
      shops: { single: ok({ ...SHOP, id: "shop-A", name: "Boutique A" }) },
      user_roles: { maybeSingle: ok({ role: "employee" }) },
    });

    const result = await ensureWorkspaceFor(client, "user-2", "e@x.fr", {});

    expect(calls.some((c) => c.table === "shops" && c.method === "insert")).toBe(false);
    expect(result.shop.id).toBe("shop-A");
    expect(result.role).toBe("employee");
  });
});

describe("inviteMember — erreurs d'écriture non silencieuses", () => {
  it("échoue et retire le profil si l'écriture du rôle échoue", async () => {
    const supabase: any = {
      rpc: async (fn: string) => (fn === "has_role" ? ok(true) : ok(null)),
      from: () => {
        const chain: any = {};
        chain.select = () => chain;
        chain.eq = () => chain;
        chain.single = async () => ok({ shop_id: "shop-A" });
        return chain;
      },
    };
    const { client: admin, calls } = mockClient({
      profiles: { write: ok(null) },
      user_roles: { write: ko("boom") },
    });
    admin.auth = {
      admin: {
        inviteUserByEmail: async () => ok({ user: { id: "inv-1", email: "new@x.fr", invited_at: "2026-10-25T00:00:00Z" } }),
      },
    };

    await expect(
      inviteMember(supabase, admin, "admin-1", {
        email: "new@x.fr",
        fullName: "Nouvel Employé",
        role: "employee",
        redirectTo: "http://localhost:8080/connexion",
      }),
    ).rejects.toThrow(/rôle/);

    // Le profil orphelin a été retiré pour éviter un état incohérent.
    expect(calls.some((c) => c.table === "profiles" && c.method === "delete")).toBe(true);
  });
});
