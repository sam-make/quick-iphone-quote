/**
 * Pure pricing engine.
 *
 * The engine is intentionally data-driven: nothing about a specific defect is
 * hardcoded. A shop defines its own deduction rules and the engine simply
 * subtracts the active, selected ones from the base price. Blocking rules
 * (iCloud lock, Activation Lock, ...) short-circuit the trade-in entirely.
 *
 * The same function runs on the client (instant feedback) and on the server
 * (authoritative value persisted with the estimation).
 */

export type RuleCategory = "esthetique" | "technique" | "blocage" | "autre";

export interface DeductionRule {
  id: string;
  name: string;
  category: RuleCategory;
  deduction: number;
  is_blocking: boolean;
  active: boolean;
  sort_order: number;
}

export interface PriceBreakdown {
  basePrice: number;
  totalDeduction: number;
  finalPrice: number;
  isBlocked: boolean;
  applied: DeductionRule[];
  blocking: DeductionRule[];
}

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  esthetique: "État esthétique",
  technique: "Vérifications techniques",
  blocage: "Blocages",
  autre: "Autres critères",
};

export const CATEGORY_ORDER: RuleCategory[] = ["esthetique", "technique", "autre", "blocage"];

/** Storage capacity price step, mirrors public.storage_step() in the database. */
export function storageStep(gb: number): number {
  if (gb >= 1024) return 170;
  if (gb >= 512) return 90;
  if (gb >= 256) return 40;
  return 0;
}

export function computePrice(basePrice: number, rules: DeductionRule[]): PriceBreakdown {
  const applied = rules.filter((rule) => rule.active);
  const blocking = applied.filter((rule) => rule.is_blocking);
  const totalDeduction = applied.reduce((sum, rule) => sum + Number(rule.deduction || 0), 0);
  const isBlocked = blocking.length > 0;
  const finalPrice = isBlocked ? 0 : Math.max(0, basePrice - totalDeduction);

  return { basePrice, totalDeduction, finalPrice, isBlocked, applied, blocking };
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatStorage(gb: number): string {
  return gb >= 1024 ? `${gb / 1024} To` : `${gb} Go`;
}