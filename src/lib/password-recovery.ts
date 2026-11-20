/** Request a recovery link without exposing whether the account exists. */
export type PasswordRecoveryResult =
  { ok: true } | { ok: false; reason: "rate_limit" | "unavailable" };

type ResetSender = (
  email: string,
  options: { redirectTo: string },
) => Promise<{ error: { status?: number } | null }>;

export async function requestPasswordReset(
  send: ResetSender,
  email: string,
  redirectTo: string,
): Promise<PasswordRecoveryResult> {
  try {
    const { error } = await send(email, { redirectTo });
    if (!error) return { ok: true };
    return { ok: false, reason: error.status === 429 ? "rate_limit" : "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
