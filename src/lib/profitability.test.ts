import { describe, expect, it } from "vitest";
import { computeProfit, toAmount, type MarketQuote } from "./profitability";

const q = (price: number | string | null): MarketQuote => ({ price: price as number, source: null, checkedAt: null, confidence: null });

describe("computeProfit", () => {
  it("marge brute par scénario = prix marché − achat − frais", () => {
    const r = computeProfit({ purchasePrice: 500, repairCosts: 40, otherCosts: 10, targetMarginPct: null, pro: q(600), private: q(700) });
    expect(r.totalInvested).toBe(550);
    expect(r.pro.grossMargin).toBe(50);
    expect(r.private.grossMargin).toBe(150);
  });
  it("prix de marché absent : aucune valeur inventée", () => {
    const r = computeProfit({ purchasePrice: 500, repairCosts: null, otherCosts: null, targetMarginPct: 20, pro: q(null), private: q("") });
    expect(r.pro).toEqual({ marketPrice: null, grossMargin: null, marginPct: null, maxPurchasePrice: null });
    expect(r.private.grossMargin).toBeNull();
  });
  it("frais vides comptent pour 0", () => {
    expect(computeProfit({ purchasePrice: 300, repairCosts: "", otherCosts: null, targetMarginPct: null, pro: q(400), private: q(null) }).pro.grossMargin).toBe(100);
  });
  it("prix de rachat conseillé = marché × (1 − marge cible) − frais", () => {
    const r = computeProfit({ purchasePrice: 0, repairCosts: 30, otherCosts: 0, targetMarginPct: 20, pro: q(600), private: q(null) });
    expect(r.pro.maxPurchasePrice).toBe(450);
  });
  it("prix conseillé jamais négatif", () => {
    expect(computeProfit({ purchasePrice: 0, repairCosts: 500, otherCosts: 0, targetMarginPct: 50, pro: q(100), private: q(null) }).pro.maxPurchasePrice).toBe(0);
  });
  it("marge négative possible (perte affichée)", () => {
    expect(computeProfit({ purchasePrice: 500, repairCosts: 0, otherCosts: 0, targetMarginPct: null, pro: q(450), private: q(null) }).pro.grossMargin).toBe(-50);
  });
  it("prix de marché à 0 : marge calculée, pourcentage non défini", () => {
    const r = computeProfit({ purchasePrice: 10, repairCosts: 0, otherCosts: 0, targetMarginPct: null, pro: q(0), private: q(null) });
    expect(r.pro.grossMargin).toBe(-10);
    expect(r.pro.marginPct).toBeNull();
  });
  it("arrondis au centime", () => {
    const r = computeProfit({ purchasePrice: "100,10", repairCosts: 0.2, otherCosts: 0, targetMarginPct: null, pro: q(200.33), private: q(null) });
    expect(r.pro.grossMargin).toBe(100.03);
  });
});

describe("toAmount", () => {
  it("rejette vides, négatifs et invalides", () => {
    expect([null, "", "  ", "-5", "abc", -1].map((v) => toAmount(v as never))).toEqual([null, null, null, null, null, null]);
    expect(toAmount("12,5")).toBe(12.5);
  });
});
