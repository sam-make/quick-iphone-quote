import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/repairs";
import { formatEuro } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/factures/$id")({
  head: () => ({
    meta: [
      { title: "Facture — ReprisePro" },
      { name: "description", content: "Facture imprimable d'une réparation, avec détail des prestations." },
      { property: "og:title", content: "Facture — ReprisePro" },
      { property: "og:description", content: "Document de facturation généré par votre boutique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoicePage,
});

interface InvoiceLine {
  name: string;
  unit_price: number;
  quantity: number;
}

function InvoicePage() {
  const { id } = Route.useParams();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, number, total, issued_at, shop_snapshot, customer_snapshot, device_snapshot, lines, repair_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!invoice) return <p className="text-sm text-muted-foreground">Facture introuvable.</p>;

  const shop = (invoice.shop_snapshot ?? {}) as Record<string, string | null>;
  const customer = (invoice.customer_snapshot ?? {}) as Record<string, string | null>;
  const device = (invoice.device_snapshot ?? {}) as Record<string, string | null>;
  const lines = (invoice.lines ?? []) as InvoiceLine[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/reparations/$id" params={{ id: invoice.repair_id }}>
            <ArrowLeft className="size-4" />
            Dossier
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimer
        </Button>
      </div>

      <article className="surface-card space-y-6 p-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">Facture {invoice.number}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(invoice.issued_at)}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p className="font-medium text-ink">{shop.name}</p>
            {shop.address ? <p>{shop.address}</p> : null}
            {shop.phone ? <p>{shop.phone}</p> : null}
            {shop.email ? <p>{shop.email}</p> : null}
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Client</p>
            <p className="text-ink">
              {customer.first_name} {customer.last_name}
            </p>
            {customer.phone ? <p className="text-muted-foreground">{customer.phone}</p> : null}
            {customer.email ? <p className="text-muted-foreground">{customer.email}</p> : null}
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Appareil</p>
            <p className="text-ink">
              {device.brand} {device.model}
            </p>
            {device.imei ? <p className="text-muted-foreground">IMEI {device.imei}</p> : null}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <th className="py-2">Prestation</th>
              <th className="py-2 text-center">Qté</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.name}-${index}`} className="border-b border-border">
                <td className="py-2 text-ink">{line.name}</td>
                <td className="py-2 text-center text-muted-foreground">{line.quantity}</td>
                <td className="py-2 text-right text-muted-foreground">
                  {formatEuro(Number(line.unit_price) * line.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-right text-lg font-semibold text-ink">Total {formatEuro(Number(invoice.total))}</p>
      </article>
    </div>
  );
}