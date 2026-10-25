import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Pencil, Smartphone, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerFormDialog } from "@/components/repairs/CustomerFormDialog";
import { StatusBadge } from "@/components/repairs/StatusBadge";
import { customerName, formatDateTime, type RepairStatus } from "@/lib/repairs";
import { formatEuro } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({
    meta: [
      { title: "Fiche client — Trade-In Pro" },
      { name: "description", content: "Coordonnées, appareils, réparations et factures d'un client." },
      { property: "og:title", content: "Fiche client — Trade-In Pro" },
      { property: "og:description", content: "Tout l'historique du client en un seul écran." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomerPage,
});

function CustomerPage() {
  const { id } = Route.useParams();
  const [editing, setEditing] = useState(false);

  const { data: customer, refetch } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: repairs = [] } = useQuery({
    queryKey: ["customer-repairs", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("repairs")
        .select("id, reference, model, brand, status, total_price, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as {
        id: string;
        reference: string;
        model: string;
        brand: string;
        status: RepairStatus;
        total_price: number;
        created_at: string;
      }[];
    },
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["customer-devices", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_devices")
        .select("id, brand, model, color, storage, imei")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as { id: string; brand: string; model: string; color: string | null; storage: string | null; imei: string | null }[];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["customer-invoices", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, number, total, issued_at")
        .eq("customer_id", id)
        .order("issued_at", { ascending: false });
      return (data ?? []) as { id: string; number: string; total: number; issued_at: string }[];
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/clients">
          <ArrowLeft className="size-4" />
          Clients
        </Link>
      </Button>

      <section className="surface-card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{customerName(customer)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer?.phone}
            {customer?.email ? ` · ${customer.email}` : ""}
          </p>
          {customer?.address && <p className="text-sm text-muted-foreground">{customer.address}</p>}
          {customer?.notes && (
            <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted-foreground">{customer.notes}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Modifier
          </Button>
          <Button asChild>
            <Link to="/reparations/nouvelle" search={{ customerId: id }}>
              <Wrench className="size-4" />
              Nouvelle réparation
            </Link>
          </Button>
        </div>
      </section>

      <Tabs defaultValue="repairs">
        <TabsList>
          <TabsTrigger value="repairs">Réparations</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="devices">Appareils</TabsTrigger>
        </TabsList>

        <TabsContent value="repairs">
          <section className="surface-card overflow-hidden">
            {repairs.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">Aucune réparation enregistrée.</p>
            ) : (
              <ul className="divide-y divide-border">
                {repairs.map((repair) => (
                  <li key={repair.id}>
                    <Link
                      to="/reparations/$id"
                      params={{ id: repair.id }}
                      className="flex flex-wrap items-center gap-3 px-6 py-4 transition-colors hover:bg-surface-2"
                    >
                      <span className="text-sm font-medium text-ink">{repair.reference}</span>
                      <span className="text-sm text-muted-foreground">
                        {repair.brand} {repair.model}
                      </span>
                      <StatusBadge status={repair.status} />
                      <span className="ml-auto text-sm font-medium text-ink">{formatEuro(Number(repair.total_price))}</span>
                      <span className="w-full text-xs text-muted-foreground">{formatDateTime(repair.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="invoices">
          <section className="surface-card overflow-hidden">
            {invoices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">Aucune facture archivée.</p>
            ) : (
              <ul className="divide-y divide-border">
                {invoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      to="/factures/$id"
                      params={{ id: invoice.id }}
                      className="flex items-center gap-3 px-6 py-4 transition-colors hover:bg-surface-2"
                    >
                      <FileText className="size-4 text-primary" />
                      <span className="text-sm font-medium text-ink">{invoice.number}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(invoice.issued_at)}</span>
                      <span className="ml-auto text-sm font-medium text-ink">{formatEuro(Number(invoice.total))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="devices">
          <section className="surface-card overflow-hidden">
            {devices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">Aucun appareil enregistré.</p>
            ) : (
              <ul className="divide-y divide-border">
                {devices.map((device) => (
                  <li key={device.id} className="flex items-center gap-3 px-6 py-4">
                    <Smartphone className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-ink">
                      {device.brand} {device.model}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {[device.color, device.storage].filter(Boolean).join(" · ")}
                    </span>
                    {device.imei && <span className="ml-auto text-xs text-muted-foreground">IMEI {device.imei}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>
      </Tabs>

      {customer && (
        <CustomerFormDialog
          open={editing}
          onOpenChange={setEditing}
          initial={{
            id: customer.id,
            firstName: customer.first_name,
            lastName: customer.last_name,
            phone: customer.phone,
            email: customer.email ?? "",
            address: customer.address ?? "",
            notes: customer.notes ?? "",
          }}
          onSaved={() => refetch()}
        />
      )}
    </div>
  );
}
