import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { createRepair } from "@/lib/repairs.functions";
import { uploadRepairPhotos } from "@/lib/repair-photos";
import { ServicesStep } from "@/components/repairs/ServicesStep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BRAND_SUGGESTIONS,
  PHASE_LABELS,
  PHOTO_PHASES,
  customerName,
  formatDuration,
  totalsOf,
  type PhotoPhase,
  type RepairLine,
  type RepairService,
} from "@/lib/repairs";
import { formatEuro } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ customerId: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/reparations/nouvelle")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Nouvelle réparation — ReprisePro" },
      { name: "description", content: "Créez un dossier de réparation en quelques clics : client, appareil, prestations, photos." },
      { property: "og:title", content: "Nouvelle réparation — ReprisePro" },
      { property: "og:description", content: "Assistant guidé pour ouvrir un dossier atelier en moins d'une minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewRepairPage,
});

const STEPS = ["Client", "Appareil", "Prestations", "Photos", "Validation"];

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

function NewRepairPage() {
  const navigate = useNavigate();
  const { customerId } = Route.useSearch();
  const { data: workspace } = useWorkspace();
  const [step, setStep] = useState(0);

  const [mode, setMode] = useState<"existing" | "new">(customerId ? "existing" : "existing");
  const [selectedId, setSelectedId] = useState<string | null>(customerId ?? null);
  const [search, setSearch] = useState("");
  const [newCustomer, setNewCustomer] = useState({ firstName: "", lastName: "", phone: "", email: "", address: "" });

  const [device, setDevice] = useState({
    brand: "Apple",
    model: "",
    color: "",
    storage: "",
    imei: "",
    unlockCode: "",
    condition: "",
    issue: "",
  });

  const [lines, setLines] = useState<RepairLine[]>([]);
  const [photos, setPhotos] = useState<{ phase: PhotoPhase; files: File[] }[]>(
    PHOTO_PHASES.map((phase) => ({ phase, files: [] })),
  );

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", workspace?.shop.id],
    enabled: Boolean(workspace?.shop.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, first_name, last_name, phone, email")
        .order("created_at", { ascending: false });
      return (data ?? []) as CustomerRow[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["repair-services", workspace?.shop.id],
    enabled: Boolean(workspace?.shop.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("repair_services")
        .select("id, name, price, duration_minutes, category, description, active, sort_order")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as RepairService[];
    },
  });

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customers.slice(0, 8);
    return customers
      .filter((customer) =>
        `${customer.first_name} ${customer.last_name} ${customer.phone}`.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [customers, search]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedId) ?? null;
  const totals = totalsOf(lines);
  const submit = useServerFn(createRepair);

  const create = useMutation({
    mutationFn: async () => {
      const result = await submit({
        data: {
          customer:
            mode === "existing" && selectedCustomer
              ? {
                  id: selectedCustomer.id,
                  firstName: selectedCustomer.first_name,
                  lastName: selectedCustomer.last_name,
                  phone: selectedCustomer.phone,
                  email: selectedCustomer.email,
                }
              : {
                  firstName: newCustomer.firstName,
                  lastName: newCustomer.lastName,
                  phone: newCustomer.phone,
                  email: newCustomer.email || null,
                  address: newCustomer.address || null,
                },
          device: {
            brand: device.brand,
            model: device.model,
            color: device.color || null,
            storage: device.storage || null,
            imei: device.imei || null,
            unlockCode: device.unlockCode || null,
          },
          condition: device.condition || null,
          issue: device.issue,
          services: lines.map((line) => ({
            serviceId: line.serviceId,
            name: line.name,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
          })),
        },
      });

      const shopId = workspace?.shop.id;
      if (shopId) {
        for (const group of photos) {
          if (group.files.length > 0) await uploadRepairPhotos(shopId, result.id, group.files, group.phase);
        }
      }
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Dossier ${result.reference} créé.`);
      navigate({ to: "/reparations/$id", params: { id: result.id } });
    },
    onError: (error: Error) => toast.error(error.message || "Création impossible."),
  });

  const canContinue = () => {
    if (step === 0) return mode === "existing" ? Boolean(selectedId) : newCustomer.phone.trim().length >= 4;
    if (step === 1) return device.model.trim().length > 0;
    if (step === 2) return lines.length > 0;
    return true;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate({ to: "/reparations" })}>
        <ArrowLeft className="size-4" />
        Réparations
      </Button>

      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">Nouvelle réparation</h1>
        <ol className="mt-4 flex flex-wrap gap-2">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                index === step
                  ? "border-primary bg-primary/10 text-primary"
                  : index < step
                    ? "border-border text-ink"
                    : "border-border text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>

      <section className="surface-card p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex gap-2">
              <Button variant={mode === "existing" ? "default" : "outline"} size="sm" onClick={() => setMode("existing")}>
                <Search className="size-4" />
                Client existant
              </Button>
              <Button variant={mode === "new" ? "default" : "outline"} size="sm" onClick={() => setMode("new")}>
                <UserPlus className="size-4" />
                Nouveau client
              </Button>
            </div>

            {mode === "existing" ? (
              <div className="space-y-3">
                <Input
                  placeholder="Rechercher par nom ou téléphone"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {filteredCustomers.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(customer.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                          selectedId === customer.id ? "bg-primary/5" : "hover:bg-surface-2",
                        )}
                      >
                        <span className="font-medium text-ink">{customerName(customer)}</span>
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                        {selectedId === customer.id && <Check className="ml-auto size-4 text-primary" />}
                      </button>
                    </li>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <li className="px-4 py-4 text-sm text-muted-foreground">Aucun client trouvé.</li>
                  )}
                </ul>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="n-first">Prénom</Label>
                  <Input
                    id="n-first"
                    value={newCustomer.firstName}
                    onChange={(event) => setNewCustomer((prev) => ({ ...prev, firstName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="n-last">Nom</Label>
                  <Input
                    id="n-last"
                    value={newCustomer.lastName}
                    onChange={(event) => setNewCustomer((prev) => ({ ...prev, lastName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="n-phone">Téléphone</Label>
                  <Input
                    id="n-phone"
                    value={newCustomer.phone}
                    onChange={(event) => setNewCustomer((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="n-email">E-mail (facultatif)</Label>
                  <Input
                    id="n-email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(event) => setNewCustomer((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="n-address">Adresse (facultative)</Label>
                  <Input
                    id="n-address"
                    value={newCustomer.address}
                    onChange={(event) => setNewCustomer((prev) => ({ ...prev, address: event.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Si ce numéro existe déjà, la fiche existante sera automatiquement réutilisée.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="d-brand">Marque</Label>
              <Input
                id="d-brand"
                list="brand-list"
                value={device.brand}
                onChange={(event) => setDevice((prev) => ({ ...prev, brand: event.target.value }))}
              />
              <datalist id="brand-list">
                {BRAND_SUGGESTIONS.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-model">Modèle</Label>
              <Input
                id="d-model"
                value={device.model}
                placeholder="iPhone 13 Pro"
                onChange={(event) => setDevice((prev) => ({ ...prev, model: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-color">Couleur</Label>
              <Input
                id="d-color"
                value={device.color}
                onChange={(event) => setDevice((prev) => ({ ...prev, color: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-storage">Capacité</Label>
              <Input
                id="d-storage"
                value={device.storage}
                placeholder="256 Go"
                onChange={(event) => setDevice((prev) => ({ ...prev, storage: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-imei">IMEI (facultatif)</Label>
              <Input
                id="d-imei"
                value={device.imei}
                onChange={(event) => setDevice((prev) => ({ ...prev, imei: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-code">Code de déverrouillage (facultatif)</Label>
              <Input
                id="d-code"
                value={device.unlockCode}
                onChange={(event) => setDevice((prev) => ({ ...prev, unlockCode: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-condition">État général</Label>
              <Input
                id="d-condition"
                value={device.condition}
                placeholder="Châssis marqué, écran fissuré…"
                onChange={(event) => setDevice((prev) => ({ ...prev, condition: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="d-issue">Description de la panne</Label>
              <Textarea
                id="d-issue"
                rows={3}
                value={device.issue}
                onChange={(event) => setDevice((prev) => ({ ...prev, issue: event.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && <ServicesStep services={services} lines={lines} onChange={setLines} />}

        {step === 3 && (
          <div className="space-y-5">
            {photos.map((group, index) => (
              <div key={group.phase} className="space-y-2">
                <Label htmlFor={`photo-${group.phase}`}>{PHASE_LABELS[group.phase]}</Label>
                <Input
                  id={`photo-${group.phase}`}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    setPhotos((prev) => prev.map((item, i) => (i === index ? { ...item, files } : item)));
                  }}
                />
                {group.files.length > 0 && (
                  <p className="text-xs text-muted-foreground">{group.files.length} photo(s) sélectionnée(s)</p>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Les photos peuvent aussi être ajoutées plus tard depuis le dossier.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="font-medium text-ink">
                {mode === "existing"
                  ? customerName(selectedCustomer)
                  : `${newCustomer.firstName} ${newCustomer.lastName}`.trim() || "Nouveau client"}
              </p>
              <p className="text-muted-foreground">
                {mode === "existing" ? selectedCustomer?.phone : newCustomer.phone}
              </p>
            </div>
            <div className="rounded-xl bg-surface-2 p-4">
              <p className="font-medium text-ink">
                {device.brand} {device.model}
              </p>
              <p className="text-muted-foreground">{[device.color, device.storage].filter(Boolean).join(" · ")}</p>
              {device.issue && <p className="mt-2 text-muted-foreground">{device.issue}</p>}
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {lines.map((line, index) => (
                <li key={index} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-ink">
                    {line.name} × {line.quantity}
                  </span>
                  <span className="font-medium text-ink">{formatEuro(line.unitPrice * line.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
              <span className="text-muted-foreground">Durée estimée : {formatDuration(totals.minutes)}</span>
              <span className="text-lg font-semibold text-ink">{formatEuro(totals.price)}</span>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-between">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
          <ArrowLeft className="size-4" />
          Précédent
        </Button>
        {step < STEPS.length - 1 ? (
          <Button disabled={!canContinue()} onClick={() => setStep((value) => value + 1)}>
            Continuer
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button disabled={create.isPending || lines.length === 0} onClick={() => create.mutate()}>
            <Check className="size-4" />
            Créer le dossier
          </Button>
        )}
      </div>
    </div>
  );
}
