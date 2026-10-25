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
      repairs: { data: { id: "repair-A", status: "en_reparation" }, error: null },
    });
    const admin = client({
      repairs: { data: [{ id: "repair-A" }], error: null },
      repair_status_history: { data: null, error: { message: "history unavailable" } },
    });
    await expect(
      changeStatusFor(user as never, admin as never, "user-A", "repair-A", "tests"),
    ).rejects.toThrow("historique non enregistré");
  });
});

import { canChangeStatus } from "./repairs";

describe("repair status workflow", () => {
  it("closed files (restitué, annulé) cannot change", () => {
    expect(canChangeStatus("annule", "recu").ok).toBe(false);
    expect(canChangeStatus("restitue", "en_reparation").ok).toBe(false);
  });
  it("restitué only after terminé", () => {
    expect(canChangeStatus("en_reparation", "restitue").ok).toBe(false);
    expect(canChangeStatus("termine", "restitue").ok).toBe(true);
  });
  it("an invoiced repair cannot be cancelled", () => {
    expect(canChangeStatus("termine", "annule", { invoiced: true }).ok).toBe(false);
    expect(canChangeStatus("diagnostic", "annule").ok).toBe(true);
  });
  it("re-applying the current status is refused", () => {
    expect(canChangeStatus("tests", "tests").ok).toBe(false);
  });
});

describe("invoice eligibility", () => {
  it("refuses invoicing an unfinished repair before any privileged write", async () => {
    const user = client({
      profiles: { data: { shop_id: "shop-A" }, error: null },
      repairs: { data: { id: "repair-A", status: "en_reparation" }, error: null },
    });
    const admin = { from: () => { throw new Error("unexpected privileged write"); } };
    await expect(
      generateInvoiceFor(user as never, admin as never, "user-A", "repair-A"),
    ).rejects.toThrow("Terminé");
  });
  it("refuses a status change on a cancelled repair before any privileged write", async () => {
    const user = client({
      profiles: { data: { shop_id: "shop-A", full_name: "A" }, error: null },
      repairs: { data: { id: "repair-A", status: "annule" }, error: null },
    });
    const admin = { from: () => { throw new Error("unexpected privileged write"); } };
    await expect(
      changeStatusFor(user as never, admin as never, "user-A", "repair-A", "recu"),
    ).rejects.toThrow("clôturé");
  });
});
