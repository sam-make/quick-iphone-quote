import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/repairs/StatusBadge";
import { changeRepairStatus, generateInvoice } from "@/lib/repairs.functions";
import { signedPhotoUrl } from "@/lib/repair-photos";
import {
  customerName,
  formatDateTime,
  PHASE_LABELS,
  PHOTO_PHASES,
  REPAIR_STATUSES,
  canChangeStatus,
  INVOICEABLE_STATUSES,
  STATUS_LABELS,
  type PhotoPhase,
  type RepairStatus,
} from "@/lib/repairs";
import { formatEuro } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reparations/$id")({
  head: () => ({
    meta: [
      { title: "Dossier de réparation — Trade-In Pro" },
      {
        name: "description",
        content: "Détail du dossier : appareil, prestations, photos et suivi de statut.",
      },
      { property: "og:title", content: "Dossier de réparation — Trade-In Pro" },
      { property: "og:description", content: "Suivi complet d'une réparation de votre boutique." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RepairDetailPage,
});

interface PhotoRow {
  id: string;
  storage_path: string;
  phase: PhotoPhase;
}

function RepairDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setStatus = useServerFn(changeRepairStatus);
  const makeInvoice = useServerFn(generateInvoice);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["repair", id],
    queryFn: async () => {
      const [repair, items, history, photos, invoice] = await Promise.all([
        supabase
          .from("repairs")
          .select(
            "id, reference, brand, model, color, storage, imei, condition, issue, status, total_price, total_minutes, created_at, employee_name, customer_id, customers(first_name, last_name, phone, email)",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase.from("repair_items").select("id, name, unit_price, quantity").eq("repair_id", id),
        supabase
          .from("repair_status_history")
          .select("id, status, employee_name, comment, created_at")
          .eq("repair_id", id)
          .order("created_at", { ascending: false }),
        supabase.from("repair_photos").select("id, storage_path, phase").eq("repair_id", id),
        supabase.from("invoices").select("id, number").eq("repair_id", id).maybeSingle(),
      ]);
      if (repair.error) throw repair.error;
      return {
        repair: repair.data,
        items: items.data ?? [],
        history: history.data ?? [],
        photos: (photos.data ?? []) as PhotoRow[],
        invoice: invoice.data,
      };
    },
  });

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const entries = await Promise.all(
        (data?.photos ?? []).map(
          async (photo) => [photo.id, (await signedPhotoUrl(photo.storage_path)) ?? ""] as const,
        ),
      );
      if (!cancelled) setPhotoUrls(Object.fromEntries(entries));
    }
    void resolve();
    return () => {
      cancelled = true;
    };
  }, [data?.photos]);

  const statusMutation = useMutation({
    mutationFn: (status: RepairStatus) => setStatus({ data: { repairId: id, status } }),
    onSuccess: () => {
      toast.success("Statut mis à jour.");
      void queryClient.invalidateQueries({ queryKey: ["repair", id] });
      void queryClient.invalidateQueries({ queryKey: ["repairs"] });
    },
    onError: (error) => {
      toast.error(error.message || "Mise à jour impossible.");
      void queryClient.invalidateQueries({ queryKey: ["repair", id] });
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: () => makeInvoice({ data: { repairId: id } }),
    onSuccess: (result: { id: string }) => {
      toast.success("Facture générée.");
      navigate({ to: "/factures/$id", params: { id: result.id } });
    },
    onError: (error) => toast.error(error.message || "Génération impossible."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (!data?.repair) return <p className="text-sm text-muted-foreground">Dossier introuvable.</p>;

  const repair = data.repair;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/reparations">
          <ArrowLeft className="size-4" />
          Réparations
        </Link>
      </Button>

      <header className="surface-card space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-ink">{repair.reference}</h1>
          <StatusBadge status={repair.status as RepairStatus} />
          <span className="ml-auto text-lg font-semibold text-ink">
            {formatEuro(Number(repair.total_price))}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {customerName(repair.customers)} · {repair.customers?.phone} · {repair.brand}{" "}
          {repair.model}
          {repair.storage ? ` · ${repair.storage}` : ""}
          {repair.color ? ` · ${repair.color}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">
          Créé le {formatDateTime(repair.created_at)} par {repair.employee_name}
          {repair.imei ? ` · IMEI ${repair.imei}` : ""}
        </p>
        {repair.issue ? <p className="text-sm text-ink">{repair.issue}</p> : null}

        <div className="flex flex-wrap gap-2 pt-2">
          {REPAIR_STATUSES.map((value) => {
            const rule = canChangeStatus(repair.status as RepairStatus, value, { invoiced: !!data.invoice });
            return (
            <button
              key={value}
              type="button"
              title={rule.ok ? undefined : rule.reason}
              disabled={statusMutation.isPending || !rule.ok}
              onClick={() => statusMutation.mutate(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                value === repair.status
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40",
              )}
            >
              {STATUS_LABELS[value]}
            </button>
            );
          })}
        </div>

        <div className="pt-2">
          {data.invoice ? (
            <Button variant="outline" asChild>
              <Link to="/factures/$id" params={{ id: data.invoice.id }}>
                <FileText className="size-4" />
                Facture {data.invoice.number}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={invoiceMutation.isPending || !INVOICEABLE_STATUSES.includes(repair.status as RepairStatus)}
              title={
                INVOICEABLE_STATUSES.includes(repair.status as RepairStatus)
                  ? undefined
                  : "Facturation possible une fois la réparation terminée"
              }
              onClick={() => invoiceMutation.mutate()}
            >
              <FileText className="size-4" />
              {invoiceMutation.isPending ? "Génération…" : "Générer la facture"}
            </Button>
          )}
        </div>
      </header>

      <section className="surface-card p-6">
        <h2 className="text-sm font-semibold text-ink">Prestations</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {data.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2">
              <span className="text-ink">
                {item.name} × {item.quantity}
              </span>
              <span className="text-muted-foreground">
                {formatEuro(Number(item.unit_price) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-sm font-semibold text-ink">Photos</h2>
        <div className="mt-3 space-y-4">
          {PHOTO_PHASES.map((phase) => {
            const photos = data.photos.filter((photo) => photo.phase === phase);
            if (photos.length === 0) return null;
            return (
              <div key={phase}>
                <p className="text-xs font-medium text-muted-foreground">{PHASE_LABELS[phase]}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photoUrls[photo.id]}
                      alt={`Photo ${PHASE_LABELS[phase]} du dossier ${repair.reference}`}
                      loading="lazy"
                      className="size-24 rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {data.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune photo.</p>
          ) : null}
        </div>
      </section>

      <section className="surface-card p-6">
        <h2 className="text-sm font-semibold text-ink">Historique</h2>
        <ol className="mt-3 space-y-3 text-sm">
          {data.history.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2">
              <StatusBadge status={entry.status as RepairStatus} />
              <span className="text-muted-foreground">
                {formatDateTime(entry.created_at)} · {entry.employee_name}
                {entry.comment ? ` · ${entry.comment}` : ""}
              </span>
            </li>
          ))}
          {data.history.length === 0 ? (
            <li className="text-muted-foreground">Aucun changement enregistré.</li>
          ) : null}
        </ol>
      </section>
    </div>
  );
}
