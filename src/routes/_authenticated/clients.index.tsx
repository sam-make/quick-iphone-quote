import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerFormDialog } from "@/components/repairs/CustomerFormDialog";
import { customerName } from "@/lib/repairs";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Clients — Trade-In Pro" },
      { name: "description", content: "Gérez vos clients, leurs appareils, leurs réparations et leurs factures." },
      { property: "og:title", content: "Clients — Trade-In Pro" },
      { property: "og:description", content: "Fiches clients, historique de réparations et factures archivées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientsPage,
});

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

function ClientsPage() {
  const { data: workspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ["customers", workspace?.shop.id],
    enabled: Boolean(workspace?.shop.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, first_name, last_name, phone, email, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerRow[];
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      `${customer.first_name} ${customer.last_name} ${customer.phone} ${customer.email ?? ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [customers, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink md:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Une fiche unique par numéro de téléphone, avec tout son historique.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nouveau client
          </Button>
          <Button asChild>
            <Link to="/reparations/nouvelle">
              <Plus className="size-4" />
              Nouvelle réparation
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom, téléphone ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            Aucun client pour le moment. Créez-en un pour démarrer une réparation.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((customer) => (
              <li key={customer.id}>
                <Link
                  to="/clients/$id"
                  params={{ id: customer.id }}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{customerName(customer)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {customer.phone}
                      {customer.email ? ` · ${customer.email}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CustomerFormDialog open={open} onOpenChange={setOpen} onSaved={() => refetch()} />
    </div>
  );
}
