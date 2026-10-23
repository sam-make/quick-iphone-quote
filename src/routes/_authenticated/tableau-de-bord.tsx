import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CalendarDays,
  Euro,
  Loader2,
  Plus,
  RefreshCw,
  Smartphone,
  Sparkles,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/repairs/StatusBadge";
import { formatEuro, formatStorage } from "@/lib/pricing";
import { customerName, type RepairStatus } from "@/lib/repairs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tableau-de-bord")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Trade-In Pro" },
      { name: "description", content: "Réparations et estimations de votre boutique en un coup d'œil." },
      { property: "og:title", content: "Tableau de bord — Trade-In Pro" },
      { property: "og:description", content: "Suivi des réparations en cours et des dernières estimations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const CLOSED: RepairStatus[] = ["termine", "restitue", "annule"];

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

type View = "repairs" | "estimations";
const VIEWS: { id: View; label: string; icon: typeof Wrench }[] = [
  { id: "repairs", label: "Réparations", icon: Wrench },
  { id: "estimations", label: "Estimations", icon: Sparkles },
];

function DashboardPage() {
  const { data: workspace } = useWorkspace();
  const shopId = workspace?.shop.id;
  const [view, setView] = useState<View>("repairs");
  const trackRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const goTo = (next: View, focus = false) => {
    setView(next);
    const index = VIEWS.findIndex((v) => v.id === next);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
    if (focus) tabRefs.current[index]?.focus();
  };

  // Keep the active tab in sync with horizontal swipes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
        const next = VIEWS[index]?.id;
        if (next) setView(next);
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Mouse drag on desktop (touch swipe is handled natively by scroll-snap).
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = { x: e.clientX, left: track.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const track = trackRef.current;
    if (!d || !track) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      track.setPointerCapture(e.pointerId);
      track.style.scrollSnapType = "none";
      track.style.scrollBehavior = "auto";
    }
    track.scrollLeft = d.left - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const track = trackRef.current;
    drag.current = null;
    if (!d?.moved || !track) return;
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    const dx = e.clientX - d.x;
    const current = Math.round(d.left / Math.max(1, track.clientWidth));
    const threshold = track.clientWidth * 0.15;
    let index = current;
    if (dx < -threshold) index = Math.min(VIEWS.length - 1, current + 1);
    if (dx > threshold) index = Math.max(0, current - 1);
    track.style.scrollSnapType = "";
    track.style.scrollBehavior = "";
    goTo(VIEWS[index].id);
    // Swallow the click that follows a drag so links don't open.
    const block = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    window.addEventListener("click", block, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", block, { capture: true }), 0);
  };

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = VIEWS.findIndex((v) => v.id === view);
    let target = -1;
    if (event.key === "ArrowRight") target = (index + 1) % VIEWS.length;
    if (event.key === "ArrowLeft") target = (index - 1 + VIEWS.length) % VIEWS.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = VIEWS.length - 1;
    if (target >= 0) {
      event.preventDefault();
      goTo(VIEWS[target].id, true);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">
          Bonjour {workspace?.profile.full_name?.split(" ")[0] ?? ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Voici l'activité de votre boutique.</p>
      </div>

      <div
        role="tablist"
        aria-label="Vues du tableau de bord"
        onKeyDown={onTabKey}
        className="relative grid w-full grid-cols-2 rounded-xl border border-border bg-muted p-1 sm:w-80"
      >
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-card shadow-sm transition-transform duration-300"
          style={{ transform: view === "estimations" ? "translateX(100%)" : "translateX(0)" }}
        />
        {VIEWS.map((v, i) => (
          <button
            key={v.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={`tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls={`panel-${v.id}`}
            tabIndex={view === v.id ? 0 : -1}
            onClick={() => goTo(v.id)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === v.id ? "text-ink" : "text-muted-foreground hover:text-ink",
            )}
          >
            <v.icon className="size-4" />
            {v.label}
          </button>
        ))}
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        className="-mx-4 flex touch-pan-x touch-pan-y snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth select-none md:select-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <section
          id="panel-repairs"
          role="tabpanel"
          aria-labelledby="tab-repairs"
          aria-hidden={view !== "repairs"}
          inert={view !== "repairs" ? true : undefined}
          className="w-full shrink-0 snap-start px-4"
        >
          <RepairsView shopId={shopId} />
        </section>
        <section
          id="panel-estimations"
          role="tabpanel"
          aria-labelledby="tab-estimations"
          aria-hidden={view !== "estimations"}
          inert={view !== "estimations" ? true : undefined}
          className="w-full shrink-0 snap-start px-4"
        >
          <EstimationsView shopId={shopId} />
        </section>
      </div>
    </div>
  );
}

/* ---------- Shared pieces ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  to,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: typeof Wrench;
  to?: "/reparations" | "/clients" | "/historique";
  hint?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold text-ink md:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  );
  const cls = "surface-card block p-5 transition-shadow";
  return to ? (
    <Link to={to} className={cn(cls, "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-card h-[118px] animate-pulse bg-muted/50" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm text-muted-foreground">Impossible de charger les données. Vérifiez votre connexion.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" /> Réessayer
      </Button>
    </div>
  );
}

function ListCard({
  title,
  link,
  linkLabel,
  loading,
  empty,
  children,
}: {
  title: string;
  link: "/reparations" | "/historique";
  linkLabel: string;
  loading: boolean;
  empty: ReactNode | null;
  children: ReactNode;
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <Link to={link} className="flex items-center gap-1 text-sm text-primary hover:underline">
          {linkLabel} <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        (empty ?? children)
      )}
    </div>
  );
}

/* ---------- Repairs view ---------- */

interface RepairRow {
  id: string;
  reference: string;
  brand: string;
  model: string;
  status: RepairStatus;
  total_price: number;
  created_at: string;
  customers: { first_name: string | null; last_name: string | null } | null;
}

function RepairsView({ shopId }: { shopId?: string }) {
  const query = useQuery({
    queryKey: ["dashboard-repairs", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const [all, open, clients, recent] = await Promise.all([
        supabase.from("repairs").select("id", { count: "exact", head: true }),
        supabase.from("repairs").select("total_price").not("status", "in", `(${CLOSED.join(",")})`),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase
          .from("repairs")
          .select("id, reference, brand, model, status, total_price, created_at, customers(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const failed = [all, open, clients, recent].find((r) => r.error);
      if (failed?.error) throw failed.error;
      const openRows = (open.data ?? []) as { total_price: number }[];
      return {
        total: all.count ?? 0,
        open: openRows.length,
        openAmount: openRows.reduce((s, r) => s + Number(r.total_price), 0),
        clients: clients.count ?? 0,
        recent: (recent.data ?? []) as unknown as RepairRow[],
      };
    },
  });
  const data = query.data;
  const loading = !shopId || query.isLoading;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/reparations/nouvelle">
            <Plus className="size-4" /> Nouvelle réparation
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/clients">
            <UserPlus className="size-4" /> Nouveau client
          </Link>
        </Button>
      </div>

      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : loading || !data ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Réparations" value={data.total} icon={Wrench} to="/reparations" />
          <StatCard label="En cours" value={data.open} icon={Loader2} to="/reparations" />
          <StatCard label="Montant en cours" value={formatEuro(data.openAmount)} icon={Euro} hint="Dossiers non terminés" />
          <StatCard label="Clients" value={data.clients} icon={Users} to="/clients" />
        </div>
      )}

      {!query.isError && (
        <ListCard
          title="Dernières réparations"
          link="/reparations"
          linkLabel="Toutes les réparations"
          loading={loading}
          empty={
            data && data.recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aucune réparation pour le moment.</p>
            ) : null
          }
        >
          <ul className="divide-y divide-border">
            {data?.recent.map((row) => (
              <li key={row.id}>
                <Link
                  to="/reparations/$id"
                  params={{ id: row.id }}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Smartphone className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {row.brand} {row.model}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.reference} · {customerName(row.customers)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={row.status} />
                    <span className="font-[family-name:var(--font-display)] text-base font-semibold text-ink">
                      {formatEuro(Number(row.total_price))}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </ListCard>
      )}
    </div>
  );
}

/* ---------- Estimations view ---------- */

interface EstimationRow {
  id: string;
  created_at: string;
  employee_name: string;
  model_name: string;
  color: string;
  storage_gb: number;
  base_price: number;
  total_deduction: number;
  final_price: number;
  is_blocked: boolean;
}

function EstimationsView({ shopId }: { shopId?: string }) {
  const query = useQuery({
    queryKey: ["dashboard-estimations", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const [all, month, recent] = await Promise.all([
        supabase.from("estimations").select("final_price, is_blocked"),
        supabase.from("estimations").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth()),
        supabase
          .from("estimations")
          .select("id, created_at, employee_name, model_name, color, storage_gb, base_price, total_deduction, final_price, is_blocked")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const failed = [all, month, recent].find((r) => r.error);
      if (failed?.error) throw failed.error;
      const rows = (all.data ?? []) as { final_price: number; is_blocked: boolean }[];
      return {
        total: rows.length,
        value: rows.filter((r) => !r.is_blocked).reduce((s, r) => s + Number(r.final_price), 0),
        blocked: rows.filter((r) => r.is_blocked).length,
        month: month.count ?? 0,
        recent: (recent.data ?? []) as EstimationRow[],
      };
    },
  });
  const data = query.data;
  const loading = !shopId || query.isLoading;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/estimation">
            <Sparkles className="size-4" /> Nouvelle estimation
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/historique">
            <CalendarDays className="size-4" /> Historique complet
          </Link>
        </Button>
      </div>

      {query.isError ? (
        <ErrorState onRetry={() => query.refetch()} />
      ) : loading || !data ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Estimations" value={data.total} icon={Sparkles} to="/historique" />
          <StatCard label="Ce mois" value={data.month} icon={CalendarDays} to="/historique" />
          <StatCard label="Valeur totale" value={formatEuro(data.value)} icon={Euro} hint="Hors reprises bloquées" />
          <StatCard label="Reprises bloquées" value={data.blocked} icon={Ban} />
        </div>
      )}

      {!query.isError && (
        <ListCard
          title="Dernières estimations"
          link="/historique"
          linkLabel="Tout l'historique"
          loading={loading}
          empty={
            data && data.recent.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aucune estimation pour le moment.</p>
            ) : null
          }
        >
          <ul className="divide-y divide-border">
            {data?.recent.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {row.model_name} · {formatStorage(row.storage_gb)} · {row.color}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleDateString("fr-FR")} — {row.employee_name}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div className="hidden text-xs text-muted-foreground sm:block">
                    <p>Base {formatEuro(Number(row.base_price))}</p>
                    <p>Déductions −{formatEuro(Number(row.total_deduction))}</p>
                  </div>
                  {row.is_blocked ? (
                    <Badge variant="destructive" className="gap-1">
                      <Ban className="size-3" /> Bloquée
                    </Badge>
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-ink">
                      {formatEuro(Number(row.final_price))}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </ListCard>
      )}
    </div>
  );
}
