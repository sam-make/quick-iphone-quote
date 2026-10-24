/**
 * Gross-margin analysis for a bought/estimated phone.
 *
 * Pure and source-agnostic: market prices come from manual entry today, and
 * an external provider can later fill the same `MarketQuote` shape. Never
 * produce a price when none is provided — missing values stay `null`.
 *
 * This is a GROSS margin: resale price − purchase price − entered costs.
 * Taxes (TVA sur marge), platform fees, shipping, labour and overheads are
 * excluded unless the user enters them in "autres frais".
 */

export type Confidence = "faible" | "moyenne" | "elevee";

export interface MarketQuote {
  price: number | null;
  source: string | null;
  checkedAt: string | null; // ISO date
  confidence: Confidence | null;
}

export interface ProfitInput {
  purchasePrice: number | string | null;
  repairCosts: number | string | null;
  otherCosts: number | string | null;
  targetMarginPct: number | string | null;
  pro: MarketQuote;
  private: MarketQuote;
}

export interface Scenario {
  marketPrice: number | null;
  grossMargin: number | null;
  marginPct: number | null; // of resale price
  maxPurchasePrice: number | null;
}

export interface ProfitResult {
  purchasePrice: number;
  totalCosts: number; // repairs + other
  totalInvested: number; // purchase + costs
  pro: Scenario;
  private: Scenario;
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Empty / invalid / negative → null. Accepts "12,50" (French decimal). */
export function toAmount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (trimmed === "") return null;
    value = Number(trimmed);
  }
  if (!Number.isFinite(value) || value < 0) return null;
  return round2(value);
}

function scenario(
  marketPrice: number | null,
  invested: number,
  costs: number,
  targetPct: number | null,
): Scenario {
  if (marketPrice === null)
    return { marketPrice: null, grossMargin: null, marginPct: null, maxPurchasePrice: null };
  const grossMargin = round2(marketPrice - invested);
  const marginPct = marketPrice > 0 ? round2((grossMargin / marketPrice) * 100) : null;
  const maxPurchasePrice =
    targetPct === null ? null : Math.max(0, round2(marketPrice * (1 - targetPct / 100) - costs));
  return { marketPrice, grossMargin, marginPct, maxPurchasePrice };
}

export function computeProfit(input: ProfitInput): ProfitResult {
  const purchasePrice = toAmount(input.purchasePrice) ?? 0;
  const totalCosts = round2((toAmount(input.repairCosts) ?? 0) + (toAmount(input.otherCosts) ?? 0));
  const totalInvested = round2(purchasePrice + totalCosts);
  const rawPct = toAmount(input.targetMarginPct);
  const targetPct = rawPct !== null && rawPct < 100 ? rawPct : null;
  return {
    purchasePrice,
    totalCosts,
    totalInvested,
    pro: scenario(toAmount(input.pro.price), totalInvested, totalCosts, targetPct),
    private: scenario(toAmount(input.private.price), totalInvested, totalCosts, targetPct),
  };
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  faible: "Faible",
  moyenne: "Moyenne",
  elevee: "Élevée",
};
