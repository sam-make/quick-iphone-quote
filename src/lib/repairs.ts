/**
 * Shared, client-safe domain helpers for the Clients & Repairs module.
 * Nothing here is shop-specific: services and prices always come from the
 * database so a shop can reconfigure everything from the admin panel.
 */

export const REPAIR_STATUSES = [
  "recu",
  "diagnostic",
  "attente_validation",
  "attente_piece",
  "en_reparation",
  "tests",
  "termine",
  "restitue",
  "annule",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const STATUS_LABELS: Record<RepairStatus, string> = {
  recu: "Reçu",
  diagnostic: "Diagnostic",
  attente_validation: "En attente de validation client",
  attente_piece: "En attente de pièce",
  en_reparation: "En réparation",
  tests: "Tests en cours",
  termine: "Terminé",
  restitue: "Restitué",
  annule: "Annulé",
};

export const STATUS_TONES: Record<RepairStatus, string> = {
  recu: "bg-primary/10 text-primary",
  diagnostic: "bg-primary/10 text-primary",
  attente_validation: "bg-amber-500/15 text-amber-600",
  attente_piece: "bg-amber-500/15 text-amber-600",
  en_reparation: "bg-blue-500/15 text-blue-600",
  tests: "bg-blue-500/15 text-blue-600",
  termine: "bg-emerald-500/15 text-emerald-600",
  restitue: "bg-emerald-500/15 text-emerald-600",
  annule: "bg-destructive/10 text-destructive",
};

export const PHOTO_PHASES = ["avant", "pendant", "apres"] as const;
export type PhotoPhase = (typeof PHOTO_PHASES)[number];

export const PHASE_LABELS: Record<PhotoPhase, string> = {
  avant: "Avant réparation",
  pendant: "Pendant la réparation",
  apres: "Après réparation",
};

/** Brands are free text so new manufacturers need no schema change. */
export const BRAND_SUGGESTIONS = [
  "Apple",
  "Samsung",
  "Google Pixel",
  "Xiaomi",
  "Huawei",
  "Honor",
  "Oppo",
  "OnePlus",
  "Autre",
];

export interface RepairService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  category: string;
  description: string | null;
  active: boolean;
  sort_order: number;
}

export interface RepairLine {
  serviceId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  durationMinutes: number;
}

export function lineTotal(line: RepairLine): number {
  return Number(line.unitPrice || 0) * Math.max(1, Number(line.quantity || 1));
}

export function totalsOf(lines: RepairLine[]) {
  return lines.reduce(
    (acc, line) => ({
      price: acc.price + lineTotal(line),
      minutes: acc.minutes + Number(line.durationMinutes || 0) * Math.max(1, Number(line.quantity || 1)),
    }),
    { price: 0, minutes: 0 },
  );
}

export function formatDuration(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

export function customerName(customer: { first_name?: string | null; last_name?: string | null } | null | undefined) {
  if (!customer) return "—";
  return `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Client";
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

/** Statuses after which a repair file is closed and can no longer change. */
export const FINAL_STATUSES: readonly RepairStatus[] = ["restitue", "annule"];

/**
 * Status workflow rule, shared by the server (authoritative) and the UI.
 * - closed files (restitué, annulé) never change;
 * - "restitué" is only reachable once the repair is "terminé";
 * - an invoiced repair can no longer be cancelled;
 * - the current status cannot be re-applied.
 */
export function canChangeStatus(
  from: RepairStatus,
  to: RepairStatus,
  options: { invoiced?: boolean } = {},
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "Le dossier a déjà ce statut." };
  if (FINAL_STATUSES.includes(from))
    return { ok: false, reason: `Dossier clôturé (${STATUS_LABELS[from]}) : statut non modifiable.` };
  if (to === "restitue" && from !== "termine")
    return { ok: false, reason: "Un appareil ne peut être restitué qu’après le statut « Terminé »." };
  if (to === "annule" && options.invoiced)
    return { ok: false, reason: "Impossible d’annuler une réparation déjà facturée." };
  return { ok: true };
}
