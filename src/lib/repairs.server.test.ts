import { describe, expect, it } from "vitest";
import { generateInvoiceFor, changeStatusFor } from "./repairs.server";

function client(tables: Record<string, { data: unknown; error: { message: string } | null }>) {
  return {
    from(table: string) {
      const result = tables[table] ?? { data: null, error: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        update: () => chain,
        single: async () => result,
        maybeSingle: async () => result,
        insert: async () => result,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return chain;
    },
  };
}

describe("repair server safeguards", () => {
  it("refuses invoicing an annule repair before any privileged write", async () => {
    const user = client({
      profiles: { data: { shop_id: "shop-A" }, error: null },
      repairs: { data: { id: "repair-A", status: "annule" }, error: null },
    });
    const admin = {
      from: () => {
        throw new Error("unexpected privileged write");
      },
    };
    await expect(
      generateInvoiceFor(user as never, admin as never, "user-A", "repair-A"),
    ).rejects.toThrow("réparation annulée");
  });
  it("reports status history write failures instead of claiming success", async () => {
    const user = client({
      profiles: { data: { shop_id: "shop-A" }, error: null },
      repairs: { data: { id: "repair-A" }, error: null },
    });
    const admin = client({
      repair_status_history: { data: null, error: { message: "history unavailable" } },
    });
    await expect(
      changeStatusFor(user as never, admin as never, "user-A", "repair-A", "tests"),
    ).rejects.toThrow("historique non enregistré");
  });
});
