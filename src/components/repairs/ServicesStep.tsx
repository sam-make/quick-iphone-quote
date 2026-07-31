import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDuration, lineTotal, totalsOf, type RepairLine, type RepairService } from "@/lib/repairs";
import { formatEuro } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/** Multi-select over the shop-configured catalogue, plus custom lines. */
export function ServicesStep({
  services,
  lines,
  onChange,
}: {
  services: RepairService[];
  lines: RepairLine[];
  onChange: (lines: RepairLine[]) => void;
}) {
  const [custom, setCustom] = useState({ name: "", price: "" });
  const totals = useMemo(() => totalsOf(lines), [lines]);

  const toggle = (service: RepairService) => {
    const existing = lines.find((line) => line.serviceId === service.id);
    if (existing) {
      onChange(lines.filter((line) => line.serviceId !== service.id));
      return;
    }
    onChange([
      ...lines,
      {
        serviceId: service.id,
        name: service.name,
        unitPrice: Number(service.price),
        quantity: 1,
        durationMinutes: Number(service.duration_minutes),
      },
    ]);
  };

  const setQuantity = (index: number, delta: number) => {
    onChange(
      lines.map((line, i) =>
        i === index ? { ...line, quantity: Math.min(50, Math.max(1, line.quantity + delta)) } : line,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const selected = lines.some((line) => line.serviceId === service.id);
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => toggle(service)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-xs)]"
                  : "border-border hover:border-primary/40 hover:bg-surface-2",
              )}
            >
              <span className="block text-sm font-medium text-ink">{service.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {formatEuro(Number(service.price))} · {formatDuration(Number(service.duration_minutes))}
              </span>
            </button>
          );
        })}
        {services.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune prestation configurée. Ajoutez-en depuis l'administration.
          </p>
        )}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-ink">Réparation personnalisée</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="custom-name">Intitulé</Label>
            <Input
              id="custom-name"
              value={custom.name}
              maxLength={120}
              onChange={(event) => setCustom((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-price">Prix (€)</Label>
            <Input
              id="custom-price"
              type="number"
              min={0}
              value={custom.price}
              onChange={(event) => setCustom((prev) => ({ ...prev, price: event.target.value }))}
            />
          </div>
          <Button
            variant="outline"
            disabled={!custom.name.trim()}
            onClick={() => {
              onChange([
                ...lines,
                {
                  serviceId: null,
                  name: custom.name.trim(),
                  unitPrice: Number(custom.price || 0),
                  quantity: 1,
                  durationMinutes: 0,
                },
              ]);
              setCustom({ name: "", price: "" });
            }}
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {lines.length > 0 && (
        <div className="surface-card overflow-hidden">
          <ul className="divide-y divide-border">
            {lines.map((line, index) => (
              <li key={`${line.serviceId ?? "custom"}-${index}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span className="text-sm font-medium text-ink">{line.name}</span>
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Retirer" onClick={() => setQuantity(index, -1)}>
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <Button variant="ghost" size="icon" aria-label="Ajouter" onClick={() => setQuantity(index, 1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
                <span className="w-20 text-right text-sm font-medium text-ink">{formatEuro(lineTotal(line))}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la ligne"
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-surface-2 px-5 py-3">
            <span className="text-sm text-muted-foreground">Durée estimée : {formatDuration(totals.minutes)}</span>
            <span className="text-lg font-semibold text-ink">{formatEuro(totals.price)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
