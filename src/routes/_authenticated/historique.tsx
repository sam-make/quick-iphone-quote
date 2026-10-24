import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Badge } from "@/components/ui/badge";
import { formatEuro, formatStorage } from "@/lib/pricing";
import { MarketAnalysisPanel } from "@/components/estimation/MarketAnalysisPanel";

export const Route = createFileRoute("/_authenticated/historique")({
  head: () => ({
    meta: [
      { title: "Historique des estimations — ReprisePro" },
      { name: "description", content: "Retrouvez toutes les estimations de reprise réalisées par votre boutique." },
      { property: "og:title", content: "Historique des estimations — ReprisePro" },
      { property: "og:description", content: "Date, employé, appareil, défauts et prix proposé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

interface Row {
  id: string;
  created_at: string;
  employee_name: string;
  model_name: string;
  color: string;
  storage_gb: number;
  imei: string | null;
  base_price: number;
  total_deduction: number;
  final_price: number;
  is_blocked: boolean;
  estimation_defects: { id: string; rule_name: string; deduction: number; is_blocking: boolean }[];
}

function HistoryPage() {
  const { data: workspace } = useWorkspace();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["history", workspace?.shop.id],
    enabled: Boolean(workspace?.shop.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimations")
        .select(
          "id, created_at, employee_name, model_name, color, storage_gb, imei, base_price, total_deduction, final_price, is_blocked, estimation_defects(id, rule_name, deduction, is_blocking)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">Historique</h1>
        <p className="mt-1 text-sm text-muted-foreground">Toutes les estimations enregistrées par votre boutique.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-muted-foreground">
          Aucune estimation enregistrée pour l'instant.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="surface-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {row.model_name} · {row.color} · {formatStorage(row.storage_gb)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("fr-FR")} — {row.employee_name}
                    {row.imei ? ` — IMEI ${row.imei}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  {row.is_blocked ? (
                    <Badge variant="destructive" className="gap-1">
                      <Ban className="size-3" /> Reprise bloquée
                    </Badge>
                  ) : (
                    <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
                      {formatEuro(Number(row.final_price))}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Base {formatEuro(Number(row.base_price))} · −{formatEuro(Number(row.total_deduction))}
                  </p>
                </div>
              </div>
              {row.estimation_defects.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
                  {row.estimation_defects.map((defect) => (
                    <Badge key={defect.id} variant={defect.is_blocking ? "destructive" : "secondary"}>
                      {defect.rule_name}
                      {!defect.is_blocking && Number(defect.deduction) > 0
                        ? ` −${formatEuro(Number(defect.deduction))}`
                        : ""}
                    </Badge>
                  ))}
                </div>
              )}
              {workspace && !row.is_blocked && <details className="mt-4 border-t border-border pt-3">
                <summary className="cursor-pointer text-sm font-medium text-primary">Analyse du marché et rentabilité</summary>
                <div className="mt-4">
                  <MarketAnalysisPanel
                    estimationId={row.id}
                    shopId={workspace.shop.id}
                    purchasePrice={Number(row.final_price)}
                    description={`${row.model_name} ${formatStorage(row.storage_gb)} ${row.color}`}
                  />
                </div>
              </details>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}