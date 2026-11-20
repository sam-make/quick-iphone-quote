import { z } from "zod";

export const defectDescriptionSchema = z.object({
  description: z.string().trim().min(3).max(1000),
});

const suggestionsSchema = z
  .object({
    ruleIds: z.array(z.string().uuid()).max(200),
    uncertainties: z.array(z.string().trim().min(1).max(250)).max(10),
  })
  .strict();

/** Reject invented IDs; the model cannot supply prices or mutate the diagnosis. */
export function validateDefectSuggestions(
  output: unknown,
  activeRules: readonly { id: string; active: boolean }[],
) {
  const result = suggestionsSchema.parse(output);
  const allowed = new Set(activeRules.filter((rule) => rule.active).map((rule) => rule.id));
  if (result.ruleIds.some((id) => !allowed.has(id))) {
    throw new Error("La réponse IA contient une règle indisponible. Relancez l’analyse.");
  }
  return { ...result, ruleIds: [...new Set(result.ruleIds)] };
}
