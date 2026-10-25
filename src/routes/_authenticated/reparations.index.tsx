import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/repairs/StatusBadge";
import { customerName, formatDateTime, REPAIR_STATUSES, STATUS_LABELS, type RepairStatus } from "@/lib/repairs";
import { formatEuro } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reparations/")({
  head: () => ({
    meta: [
      { title: "Réparations — Trade-In Pro" },
      { name: "description", content: "Suivez tous les dossiers de réparation de votre boutique en temps réel." },
      { property: "og:title", content: "Réparations — Trade-In Pro" },
      { property: "og:description", content: "Statuts, clients, appareils et montants en un coup d'œil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RepairsPage,
});

interface RepairRow {
  id: string;
  reference: string;
  brand: string;
  model: string;
  status: RepairStatus;
  total_price: number;
  created_at: string;
  employee_name: string;
  customers: { first_name: string; last_name: string; phone: string } | null;
}

function RepairsPage() {
  const { data: workspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RepairStatus | "all">("all");

  const { data: repairs = [], isLoading } = useQuery({
    queryKey: ["repairs", workspace?.shop.id],
    enabled: Boolean(workspace?.shop.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repairs")
        .select("id, reference, brand, model, status, total_price, created_at, employee_name, customers(first_name, last_name, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as RepairRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return repairs.filter((repair) => {
      if (status !== "all" && repair.status !== status) return false;
      if (!term) return true;
      return `${repair.reference} ${repair.brand} ${repair.model} ${customerName(repair.customers)} ${repair.customers?.phone ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [repairs, search, status]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink md:text-3xl">Réparations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tous les dossiers en cours et terminés de la boutique.</p>
        </div>
        <Button asChild>
          <Link to="/reparations/nouvelle">
            <Plus className="size-4" />
            Nouvelle réparation
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher un dossier, un client, un appareil"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...REPAIR_STATUSES] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              status === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-surface-2",
            )}
          >
            {value === "all" ? "Tous" : STATUS_LABELS[value]}
          </button>
        ))}
      </div>

      <section className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Aucun dossier ne correspond.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((repair) => (
              <li key={repair.id}>
                <Link
                  to="/reparations/$id"
                  params={{ id: repair.id }}
                  className="flex flex-wrap items-center gap-3 px-6 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="text-sm font-medium text-ink">{repair.reference}</span>
                  <span className="text-sm text-muted-foreground">
                    {customerName(repair.customers)} · {repair.brand} {repair.model}
                  </span>
                  <StatusBadge status={repair.status} />
                  <span className="ml-auto text-sm font-medium text-ink">{formatEuro(Number(repair.total_price))}</span>
                  <span className="w-full text-xs text-muted-foreground">
                    {formatDateTime(repair.created_at)} · {repair.employee_name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
