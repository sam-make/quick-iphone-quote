import { describe, expect, it, vi } from "vitest";
import { requestPasswordReset } from "./password-recovery";

const email = "test@example.invalid";
const redirectTo = "https://example.invalid/reset-password";

describe("requestPasswordReset", () => {
  it("signale un succès lorsque l'API accepte la demande", async () => {
    const send = vi.fn().mockResolvedValue({ error: null });
    expect(await requestPasswordReset(send, email, redirectTo)).toEqual({ ok: true });
    expect(send).toHaveBeenCalledWith(email, { redirectTo });
  });

  it("ne signale pas un succès si Supabase renvoie une erreur", async () => {
    const send = vi.fn().mockResolvedValue({ error: { status: 500 } });
    expect(await requestPasswordReset(send, email, redirectTo)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("identifie un dépassement de limite sans divulguer le compte", async () => {
    const send = vi.fn().mockResolvedValue({ error: { status: 429 } });
    expect(await requestPasswordReset(send, email, redirectTo)).toEqual({
      ok: false,
      reason: "rate_limit",
    });
  });

  it("traite une erreur réseau sans fausse confirmation", async () => {
    const send = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await requestPasswordReset(send, email, redirectTo)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});
