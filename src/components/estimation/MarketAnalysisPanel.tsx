import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro } from "@/lib/pricing";
import { CONFIDENCE_LABELS, computeProfit, toAmount, type Confidence } from "@/lib/profitability";
import { cn } from "@/lib/utils";

interface Props {
  estimationId: string;
  shopId: string;
  purchasePrice: number;
  description: string;
}

const EMPTY = {
  repair_costs: "",
  other_costs: "",
  target_margin_pct: "",
  pro_price: "",
  pro_source: "",
  pro_checked_at: "",
  pro_confidence: "",
  private_price: "",
  private_source: "",
  private_checked_at: "",
  private_confidence: "",
  notes: "",
};
type Form = typeof EMPTY;

const money = (v: number | null) => (v === null ? "À renseigner" : formatEuro(v));
const fmt2 = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

export function MarketAnalysisPanel({ estimationId, shopId, purchasePrice, description }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["market-analysis", estimationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimation_market_analyses")
        .select("*")
        .eq("estimation_id", estimationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!data) return;
    const next = { ...EMPTY };
    (Object.keys(EMPTY) as (keyof Form)[]).forEach((k) => {
      const v = (data as Record<string, unknown>)[k];
      next[k] = v === null || v === undefined ? "" : String(v);
    });
    setForm(next);
  }, [data]);

  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const q = (p: "pro" | "private") => ({
    price: toAmount(form[`${p}_price`]),
    source: form[`${p}_source`] || null,
    checkedAt: form[`${p}_checked_at`] || null,
    confidence: (form[`${p}_confidence`] || null) as Confidence | null,
  });
  const r = computeProfit({
    purchasePrice,
    repairCosts: form.repair_costs,
    otherCosts: form.other_costs,
    targetMarginPct: form.target_margin_pct,
    pro: q("pro"),
    private: q("private"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const amounts: (keyof Form)[] = [
        "repair_costs",
        "other_costs",
        "target_margin_pct",
        "pro_price",
        "private_price",
      ];
      if (amounts.some((key) => form[key].trim() !== "" && toAmount(form[key]) === null)) {
        throw new Error("Saisissez des montants valides, supérieurs ou égaux à zéro.");
      }
      const target = toAmount(form.target_margin_pct);
      if (target !== null && target >= 100)
        throw new Error("La marge cible doit être inférieure à 100 %.");
      const txt = (v: string) => v.trim() || null;
      const { error } = await supabase.from("estimation_market_analyses").upsert(
        {
          estimation_id: estimationId,
          shop_id: shopId,
          repair_costs: toAmount(form.repair_costs),
          other_costs: toAmount(form.other_costs),
          target_margin_pct: toAmount(form.target_margin_pct),
          pro_price: toAmount(form.pro_price),
          pro_source: txt(form.pro_source),
          pro_checked_at: txt(form.pro_checked_at),
          pro_confidence: txt(form.pro_confidence),
          private_price: toAmount(form.private_price),
          private_source: txt(form.private_source),
          private_checked_at: txt(form.private_checked_at),
          private_confidence: txt(form.private_confidence),
          notes: txt(form.notes),
        },
        { onConflict: "estimation_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Analyse enregistrée.");
      qc.invalidateQueries({ queryKey: ["market-analysis", estimationId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (isError)
    return (
      <div role="alert" className="space-y-2">
        <p className="text-sm text-destructive">Impossible de charger l’analyse enregistrée.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Réessayer
        </Button>
      </div>
    );

  const quoteFields = (p: "pro" | "private", title: string) => (
    <fieldset className="space-y-3 border-t border-border pt-4">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Prix de marché (€)</Label>
          <Input
            inputMode="decimal"
            value={form[`${p}_price`]}
            onChange={set(`${p}_price`)}
            placeholder="À renseigner"
          />
        </div>
        <div className="space-y-1">
          <Label>Source</Label>
          <Input
            value={form[`${p}_source`]}
            onChange={set(`${p}_source`)}
            placeholder="Site, annonce, grossiste…"
          />
        </div>
        <div className="space-y-1">
          <Label>Date de consultation</Label>
          <Input type="date" value={form[`${p}_checked_at`]} onChange={set(`${p}_checked_at`)} />
        </div>
        <div className="space-y-1">
          <Label>Confiance</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={form[`${p}_confidence`]}
            onChange={set(`${p}_confidence`)}
          >
            <option value="">Non précisée</option>
            {(Object.keys(CONFIDENCE_LABELS) as Confidence[]).map((c) => (
              <option key={c} value={c}>
                {CONFIDENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );

  const margin = (v: number | null) => (
    <span
      className={cn(
        "font-medium",
        v === null ? "text-muted-foreground" : v < 0 ? "text-destructive" : "text-ink",
      )}
    >
      {v === null ? "À renseigner" : fmt2(v)}
    </span>
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Comparer avec : {description}, même état, batterie et défauts.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Pièces et réparations (€)</Label>
          <Input
            inputMode="decimal"
            value={form.repair_costs}
            onChange={set("repair_costs")}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>Autres frais (€)</Label>
          <Input
            inputMode="decimal"
            value={form.other_costs}
            onChange={set("other_costs")}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>Marge cible (%)</Label>
          <Input
            inputMode="decimal"
            value={form.target_margin_pct}
            onChange={set("target_margin_pct")}
            placeholder="À renseigner"
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {quoteFields("pro", "Revente à un professionnel")}
        {quoteFields("private", "Revente à un particulier")}
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={set("notes")} />
      </div>

      <dl className="grid gap-x-6 gap-y-2 border-y border-border py-4 text-sm sm:grid-cols-2 [&>div]:gap-3 [&>div>dd]:shrink-0">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Prix d'achat</dt>
          <dd className="font-medium text-ink">{fmt2(r.purchasePrice)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Réparations et frais</dt>
          <dd className="font-medium text-ink">{fmt2(r.totalCosts)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Prix marché pro</dt>
          <dd>{money(r.pro.marketPrice)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Marge brute pro</dt>
          <dd>{margin(r.pro.grossMargin)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Prix marché particulier</dt>
          <dd>{money(r.private.marketPrice)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Marge brute particulier</dt>
          <dd>{margin(r.private.grossMargin)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Marge pro (%)</dt>
          <dd>
            {r.pro.marginPct === null
              ? "À renseigner"
              : `${r.pro.marginPct.toLocaleString("fr-FR")} %`}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Marge particulier (%)</dt>
          <dd>
            {r.private.marginPct === null
              ? "À renseigner"
              : `${r.private.marginPct.toLocaleString("fr-FR")} %`}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Rachat max conseillé (pro)</dt>
          <dd>{money(r.pro.maxPurchasePrice)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Rachat max conseillé (particulier)</dt>
          <dd>{money(r.private.maxPurchasePrice)}</dd>
        </div>
      </dl>

      <p className="flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Marge brute = prix de marché − prix d'achat − frais saisis. Ce n'est pas un bénéfice net :
        TVA sur marge, commissions de plateforme, envoi, main-d'œuvre et charges fixes sont exclus
        sauf s'ils sont saisis dans « Autres frais ». Les prix saisis manuellement viennent souvent
        d'annonces, qui ne sont pas forcément des prix de vente conclus. Rachat conseillé = prix de
        marché × (1 − marge cible) − frais.
      </p>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? "Enregistrement…" : "Enregistrer l'analyse"}
      </Button>
    </div>
  );
}
