import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AlertTriangle, CreditCard, Gauge, Loader2, History, LogOut, Menu, Settings, Sparkles, Users, Wrench, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getShopSubscription } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { hasSubscriptionAccess } from "@/lib/subscription";
import { LEGACY_TRANSITION_END, resolveShopAccess } from "@/lib/access";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: Gauge },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/reparations", label: "Réparations", icon: Wrench },
  { to: "/estimation", label: "Nouvelle estimation", icon: Sparkles },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/administration", label: "Administration", icon: Settings, adminOnly: true },
  { to: "/abonnement", label: "Abonnement", icon: CreditCard },
] as const;

const subscriptionOptions = queryOptions({
  queryKey: ["test-subscription"],
  queryFn: () => getTestSubscription({ data: { environment: "sandbox" } }),
  staleTime: 30_000,
});

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: workspace, isLoading: workspaceLoading, isError: workspaceError, refetch } = useWorkspace();
  const { data: subscriptionRows } = useQuery(subscriptionOptions);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);

  const subscription = subscriptionRows?.find((s) => hasSubscriptionAccess(s)) ?? subscriptionRows?.[0] ?? null;
  const access = workspace ? resolveShopAccess(subscription, workspace.shop.created_at) : null;
  const transitionEndLabel = new Date(LEGACY_TRANSITION_END).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/connexion", replace: true });
  }

  // Admin link stays visible (as a loading placeholder) until the role is known,
  // so a slow or failed workspace load never silently hides it.
  const roleKnown = Boolean(workspace);
  const items = NAV.filter((item) => !("adminOnly" in item && item.adminOnly) || !roleKnown || workspace?.role === "admin");

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              active
                ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                : "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-primary")} />
            {item.label}
            {"adminOnly" in item && item.adminOnly && workspaceLoading && (
              <Loader2 className="ml-auto size-3.5 animate-spin text-muted-foreground" aria-label="Chargement du rôle" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-surface-2">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/70 bg-surface-2 px-4 py-6 lg:flex">
        <Link to="/tableau-de-bord" className="px-2">
          <Logo />
        </Link>
        <div className="mt-8 flex-1">{nav}</div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="truncate text-sm font-medium text-ink">{workspace?.shop.name ?? "…"}</p>
          <p className="truncate text-xs text-muted-foreground">{workspace?.profile.full_name}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={handleSignOut}>
            <LogOut className="size-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/70 bg-surface-2/85 px-5 backdrop-blur-xl lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((value) => !value)}
              aria-label="Menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <span className="text-sm font-medium text-muted-foreground">
              {workspace?.shop.name ?? "Chargement…"}
            </span>
          </div>
          <Button asChild size="sm">
            <Link to="/estimation">
              <Sparkles className="size-4" />
              Nouvelle estimation
            </Link>
          </Button>
        </header>

        {open && (
          <div className="border-b border-border/70 bg-surface-2 px-4 py-4 lg:hidden">
            {nav}
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Déconnexion
            </Button>
          </div>
        )}

        {workspaceError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive lg:px-8">
            <AlertTriangle className="size-4" />
            <span className="flex-1">Impossible de charger votre boutique. Certaines rubriques peuvent être indisponibles.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        )}

        {access?.allowed && access.reason === "legacy_transition" && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900 lg:px-8">
            <AlertTriangle className="size-4" />
            <span className="flex-1">
              Période de transition : les fonctionnalités de votre boutique restent accessibles jusqu’au {transitionEndLabel}.
              Souscrivez à l’offre Trade-In Pro (10,99 €/mois) pour conserver l’accès ensuite.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/abonnement">Voir l’abonnement</Link>
            </Button>
          </div>
        )}

        {access && !access.allowed && (
          <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive lg:px-8">
            <AlertTriangle className="size-4" />
            <span className="flex-1">
              Abonnement inactif : les fonctionnalités de la boutique sont suspendues. Vos données sont conservées —
              souscrivez à l’offre Trade-In Pro (10,99 €/mois) pour réactiver l’accès.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/abonnement">Gérer l’abonnement</Link>
            </Button>
          </div>
        )}

        <main className="flex-1 px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}