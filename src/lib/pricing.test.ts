import { describe, expect, it } from "vitest";
import { computePrice, resolveBasePrice, storageStep, type DeductionRule } from "./pricing";

const rule = (over: Partial<DeductionRule>): DeductionRule => ({
  id: over.id ?? Math.random().toString(36),
  name: "r",
  category: "technique",
  deduction: 0,
  is_blocking: false,
  active: true,
  sort_order: 0,
  ...over,
});

describe("resolveBasePrice", () => {
  it("prend le prix boutique exact (couleur) en priorité", () => {
    expect(resolveBasePrice(500, 128, "Noir", [{ color: "*", base_price: 600 }, { color: "Noir", base_price: 650 }])).toBe(650);
  });
  it("sinon le prix boutique toutes couleurs", () => {
    expect(resolveBasePrice(500, 128, "Bleu", [{ color: "*", base_price: "600" }, { color: "Noir", base_price: 650 }])).toBe(600);
  });
  it("sinon le prix catalogue + palier de capacité", () => {
    expect(resolveBasePrice(500, 128, "Bleu", [])).toBe(500);
    expect(resolveBasePrice(500, 256, "Bleu", [])).toBe(540);
    expect(resolveBasePrice("500", 512, "Bleu", [])).toBe(590);
    expect(resolveBasePrice(500, 1024, "Bleu", [])).toBe(670);
  });
  it("un prix boutique à 0 € est respecté (pas de repli)", () => {
    expect(resolveBasePrice(500, 256, "Noir", [{ color: "Noir", base_price: 0 }])).toBe(0);
  });
});

describe("storageStep", () => {
  it("paliers aux seuils exacts", () => {
    expect([64, 128, 255, 256, 511, 512, 1023, 1024, 2048].map(storageStep)).toEqual([0, 0, 0, 40, 40, 90, 90, 170, 170]);
  });
});

describe("computePrice", () => {
  it("exemple du cahier des charges : 650 - 20 - 30 - 100 = 500 €", () => {
    const r = computePrice(650, [rule({ deduction: 20 }), rule({ deduction: 30 }), rule({ deduction: 100 })]);
    expect(r.totalDeduction).toBe(150);
    expect(r.finalPrice).toBe(500);
    expect(r.isBlocked).toBe(false);
  });
  it("ignore les règles inactives", () => {
    expect(computePrice(650, [rule({ deduction: 20 }), rule({ deduction: 300, active: false })]).finalPrice).toBe(630);
  });
  it("un défaut bloquant met le prix à 0 €", () => {
    const r = computePrice(650, [rule({ deduction: 20 }), rule({ deduction: 0, is_blocking: true, category: "blocage" })]);
    expect(r.isBlocked).toBe(true);
    expect(r.finalPrice).toBe(0);
    expect(r.blocking).toHaveLength(1);
  });
  it("le prix ne descend jamais sous 0 €", () => {
    expect(computePrice(100, [rule({ deduction: 250 })]).finalPrice).toBe(0);
  });
  it("aucun défaut : prix de base", () => {
    expect(computePrice(420, []).finalPrice).toBe(420);
  });
  it("conserve les centimes sans arrondir le calcul", () => {
    const r = computePrice(100.5, [rule({ deduction: "10.25" as unknown as number })]);
    expect(r.totalDeduction).toBe(10.25);
    expect(r.finalPrice).toBe(90.25);
  });
});
