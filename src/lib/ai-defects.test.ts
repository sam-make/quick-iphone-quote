import { describe, expect, it } from "vitest";
import { defectDescriptionSchema, validateDefectSuggestions } from "./ai-defects";

const active = "00000000-0000-4000-8000-000000000001";
const inactive = "00000000-0000-4000-8000-000000000002";
const rules = [
  { id: active, active: true },
  { id: inactive, active: false },
];

describe("AI defect suggestions", () => {
  it("accepts only existing active rules and removes duplicates", () => {
    expect(
      validateDefectSuggestions({ ruleIds: [active, active], uncertainties: [] }, rules).ruleIds,
    ).toEqual([active]);
  });
  it("rejects inactive rules", () => {
    expect(() =>
      validateDefectSuggestions({ ruleIds: [inactive], uncertainties: [] }, rules),
    ).toThrow();
  });
  it("rejects another shop's rule", () => {
    expect(() => validateDefectSuggestions({ ruleIds: [active], uncertainties: [] }, [])).toThrow();
  });
  it("rejects AI prices", () => {
    expect(() =>
      validateDefectSuggestions({ ruleIds: [], uncertainties: [], price: 500 }, rules),
    ).toThrow();
  });
  it("accepts uncertainty without inventing a deduction", () => {
    expect(
      validateDefectSuggestions(
        { ruleIds: [], uncertainties: ["État de la batterie à vérifier"] },
        rules,
      ).ruleIds,
    ).toEqual([]);
  });
  it("rejects an empty description", () => {
    expect(defectDescriptionSchema.safeParse({ description: "  " }).success).toBe(false);
  });
});
