import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Ban, CalendarDays, Euro, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEuro, formatStorage } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — ReprisePro" },
      { name: "description", content: "Suivez l'activité de reprise de votre boutique au jour le jour." },
      { property: "og:title", content: "Tableau de bord — ReprisePro" },
      { property: "og:description", content: "Estimations du jour, du mois et dernières reprises." },
    ],
  }),
  component: DashboardPage,
});

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function startOfMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

function DashboardPage() {
  const { data: workspace } = useWorkspace();
  const shopId = workspace?.shop.id;

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const [today, month, recent] = await Promise.all([
        supabase.from("estimations").select("id", { count: "exact", head: true }).gte("created_at", startOfToday()),
        supabase.from("estimations").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth()),
        supabase
          .from("estimations")
          .select("id, created_at, employee_name, model_name, color, storage_gb, final_price, is_blocked")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const monthRows = await supabase
        .from("estimations")
        .select("final_price")
        .gte("created_at", startOfMonth());
      const total = (monthRows.data ?? []).reduce(
        (sum: number, row: { final_price: number }) => sum + Number(row.final_price),
        0,
      );
      return {
        today: today.count ?? 0,
        month: month.count ?? 0,
        volume: total,
        recent: recent.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Estimations aujourd'hui", value: stats?.today ?? 0, icon: Sparkles },
    { label: "Estimations ce mois", value: stats?.month ?? 0, icon: CalendarDays },
    { label: "Volume de reprise du mois", value: formatEuro(stats?.volume ?? 0), icon: Euro },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink md:text-3xl">
            Bonjour {workspace?.profile.full_name?.split(" ")[0] ?? ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Voici l'activité de reprise de votre boutique.</p>
        </div>
        <Button asChild size="lg">
          <Link to="/estimation">
            <Sparkles className="size-4" />
            Nouvelle estimation
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="surface-card animate-rise p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className="size-4 text-primary" />
            </div>
            <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-ink">Dernières estimations</h2>
          <Link to="/historique" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Tout l'historique <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        {(stats?.recent.length ?? 0) === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Aucune estimation pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {stats?.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {row.model_name} · {row.color} · {formatStorage(row.storage_gb)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("fr-FR")} — {row.employee_name}
                  </p>
                </div>
                {row.is_blocked ? (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="size-3" /> Reprise bloquée
                  </Badge>
                ) : (
                  <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
                    {formatEuro(Number(row.final_price))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}