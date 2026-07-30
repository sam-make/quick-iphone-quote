import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Gauge, History, LogOut, Menu, Settings, Sparkles, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/tableau-de-bord", label: "Tableau de bord", icon: Gauge },
  { to: "/estimation", label: "Nouvelle estimation", icon: Sparkles },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/administration", label: "Administration", icon: Settings, adminOnly: true },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: workspace } = useWorkspace();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/connexion", replace: true });
  }

  const items = NAV.filter((item) => !("adminOnly" in item && item.adminOnly) || workspace?.role === "admin");

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.to;
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

        <main className="flex-1 px-5 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}