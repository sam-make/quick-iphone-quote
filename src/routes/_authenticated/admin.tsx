import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Pause,
  Play,
  Archive,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ownerAccess,
  globalOverview,
  listGlobalData,
  updateGlobalEntity,
} from "@/lib/super-admin.functions";
import { OwnerAnalytics, ownerAnalyticsOptions, type AnalyticsFilters } from "@/components/admin/OwnerAnalytics";

export const Route = createFileRoute("/_authenticated/admin")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { section?: "analytics"; days?: 7|30|90; shop?: string; rank?: "estimates"|"frequency"; inactive?: "all"|"never"|"7"|"14"|"30"; q?: string } => ({
    section: search.section === "analytics" ? "analytics" : undefined,
    days: search.days === 7 || search.days === 90 || search.days === "7" || search.days === "90" ? Number(search.days) as 7|90 : 30,
    shop: typeof search.shop === "string" && /^[0-9a-f-]{36}$/i.test(search.shop) ? search.shop : undefined,
    rank: search.rank === "frequency" ? "frequency" : "estimates",
    inactive: search.inactive === "never" || search.inactive === "7" || search.inactive === "14" || search.inactive === "30" ? search.inactive : "all",
    q: typeof search.q === "string" ? search.q.slice(0,100) : "",
  }),
  loaderDeps: ({search}) => ({section: search.section, days: search.days ?? 30, shop: search.shop ?? ""}),
  loader: async ({context,deps}) => {
    if (deps.section === "analytics" && await ownerAccess()) await context.queryClient.ensureQueryData(ownerAnalyticsOptions(deps.days,deps.shop));
  },
  errorComponent: () => <div role="alert">Impossible de charger les statistiques. <Button onClick={()=>window.location.reload()}>Réessayer</Button></div>,
  notFoundComponent: () => <p>Page introuvable.</p>,
  head: () => ({
    meta: [
      { title: "Super Administration — Trade-In Pro" },
      { name: "description", content: "Espace propriétaire sécurisé de Trade-In Pro." },
      { property: "og:title", content: "Super Administration — Trade-In Pro" },
      {
        property: "og:description",
        content: "Administration globale sécurisée des boutiques et de leur activité.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OwnerPage,
});

const sections = [
  ["shops", "Boutiques"],
  ["profiles", "Utilisateurs"],
  ["repairs", "Réparations"],
  ["estimations", "Estimations"],
  ["device_models", "Catalogue commun"],
  ["deduction_rules", "Règles boutique"],
  ["shop_prices", "Prix boutique"],
  ["admin_audit_events", "Journal d’audit"],
] as const;
type Section = (typeof sections)[number][0];
type Row = Record<string, unknown>;
const text = (value: unknown) => (value == null ? "—" : String(value));

function OwnerPage() {
  const routeSearch = Route.useSearch();
  const navigate = useNavigate({from: Route.fullPath});
  const analytics = routeSearch.section === "analytics";
  const analyticsFilters: AnalyticsFilters = {days:routeSearch.days ?? 30,shop:routeSearch.shop ?? "",rank:routeSearch.rank ?? "estimates",inactive:routeSearch.inactive ?? "all",q:routeSearch.q ?? ""};
  const accessFn = useServerFn(ownerAccess);
  const overviewFn = useServerFn(globalOverview);
  const listFn = useServerFn(listGlobalData);
  const updateFn = useServerFn(updateGlobalEntity);
  const cache = useQueryClient();
  const [section, setSection] = useState<Section>("shops");
  const [search, setSearch] = useState("");
  const [shopId, setShopId] = useState("");
  const [state, setState] = useState<"all" | "active" | "suspended" | "archived">("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [pending, setPending] = useState<{
    kind: "shop" | "member";
    targetId: string;
    changes: { suspended?: boolean; archived?: boolean; role?: "admin" | "employee" };
    label: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const access = useQuery({ queryKey: ["owner-access"], queryFn: () => accessFn(), retry: false });
  const overview = useQuery({
    queryKey: ["global-overview"],
    queryFn: () => overviewFn(),
    enabled: access.data === true && !analytics,
  });
  const list = useQuery({
    queryKey: ["global-data", section, search, shopId, state, page],
    queryFn: () => listFn({ data: { section, search, shopId: shopId || undefined, state, page } }),
    enabled: access.data === true && !analytics,
  });
  const mutate = useMutation({
    mutationFn: (data: {
      kind: "shop" | "member";
      targetId: string;
      changes: {
        name?: string;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
        suspended?: boolean;
        archived?: boolean;
        role?: "admin" | "employee";
      };
    }) => updateFn({ data }),
    onSuccess: () => {
      toast.success("Modification enregistrée.");
      setEditing(null);
      setPending(null);
      setConfirmation("");
      cache.invalidateQueries({ queryKey: ["global-data"] });
      cache.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (error) => toast.error(error.message),
  });
  if (access.isPending) return <p role="status">Vérification de l’accès…</p>;
  if (!access.data)
    return (
      <div role="alert">
        <h1 className="text-2xl font-semibold">Accès refusé</h1>
        <p className="mt-3 text-muted-foreground">
          Cet espace est réservé au propriétaire autorisé.
        </p>
      </div>
    );
  const rows = list.data?.rows ?? [];
  const columns =
    section === "shops"
      ? ["name", "email", "phone"]
      : section === "profiles"
        ? ["full_name", "email", "shop_id"]
        : section === "repairs"
          ? ["reference", "model", "status", "total_price"]
          : section === "estimations"
            ? ["model_name", "final_price", "shop_id"]
            : section === "admin_audit_events"
              ? ["action", "target_id", "created_at"]
              : section === "shop_prices"
                ? ["model_id", "color", "storage_gb", "base_price"]
                : section === "deduction_rules"
                  ? ["name", "category", "deduction", "shop_id"]
                  : ["name", "brand", "base_price"];
  const labels: Record<string, string> = {
    name: "Nom",
    email: "E-mail",
    phone: "Téléphone",
    full_name: "Utilisateur",
    shop_id: "Boutique",
    reference: "Référence",
    model: "Modèle",
    model_name: "Modèle",
    status: "Statut",
    total_price: "Total (€)",
    final_price: "Reprise (€)",
    action: "Action",
    target_id: "Cible",
    created_at: "Date",
    model_id: "Modèle",
    color: "Couleur",
    storage_gb: "Capacité (Go)",
    base_price: "Prix (€)",
    category: "Catégorie",
    deduction: "Déduction (€)",
    brand: "Marque",
  };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex items-center gap-3">
        <ShieldCheck className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Super Administration</h1>
          <p className="text-sm text-muted-foreground">Trade-In Pro</p>
        </div>
      </header>
      {!analytics && <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {["Boutiques", "Utilisateurs", "Réparations", "Estimations"].map((label, i) => (
          <div key={label} className="border-b-2 border-primary/30 py-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-semibold">{overview.data?.[i] ?? "…"}</p>
          </div>
        ))}
      </div>}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Administration globale">
        <Button role="tab" aria-selected={analytics} variant={analytics ? "default" : "outline"} onClick={()=>navigate({search:prev=>({...prev,section:"analytics"})})}>Analytics</Button>
        {sections.map(([id, label]) => (
          <Button
            key={id}
            role="tab"
            aria-selected={!analytics && section === id}
            variant={!analytics && section === id ? "default" : "outline"}
            onClick={() => {
              void navigate({search:prev=>({...prev,section:undefined})});
              setSection(id);
              setPage(0);
              setSearch("");
              setState("all");
            }}
          >
            {label}
          </Button>
        ))}
      </div>
      {analytics ? <OwnerAnalytics filters={analyticsFilters} onChange={change=>{void navigate({search:prev=>({...prev,...change,section:"analytics"}),replace:true});}}/> : <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            aria-label="Rechercher"
            placeholder="Rechercher"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {["shops", "profiles"].includes(section) && (
          <Select
            value={state}
            onValueChange={(v: typeof state) => {
              setState(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les accès</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="suspended">Suspendus</SelectItem>
              {section === "shops" && <SelectItem value="archived">Archivés</SelectItem>}
            </SelectContent>
          </Select>
        )}
        {["profiles", "repairs", "estimations", "deduction_rules", "shop_prices"].includes(
          section,
        ) && (
          <Input
            aria-label="Identifiant boutique"
            placeholder="Identifiant boutique"
            className="w-full sm:w-72"
            value={shopId}
            onChange={(e) => {
              setShopId(e.target.value);
              setPage(0);
            }}
          />
        )}
      </div>
      {list.isPending ? (
        <p role="status">Chargement…</p>
      ) : list.isError ? (
        <div role="alert">
          Chargement impossible.{" "}
          <Button variant="outline" onClick={() => list.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-3 font-medium">
                    {labels[c]}
                  </th>
                ))}
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={text(row.id)} className="border-b border-border">
                  <>
                    {columns.map((c) => (
                      <td key={c} className="max-w-52 break-words px-3 py-4">
                        {text(row[c])}
                      </td>
                    ))}
                  </>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetail(row)}>
                        Détails
                      </Button>
                      {section === "shops" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier la boutique"
                            aria-label={`Modifier ${text(row.name)}`}
                            onClick={() => {
                              setEditing(row);
                              setForm({
                                name: text(row.name),
                                address: String(row.address ?? ""),
                                phone: String(row.phone ?? ""),
                                email: String(row.email ?? ""),
                              });
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={row.archived_at ? "Restaurer" : "Archiver"}
                            aria-label={row.archived_at ? "Restaurer" : "Archiver"}
                            onClick={() =>
                              setPending({
                                kind: "shop",
                                targetId: text(row.id),
                                changes: { archived: !row.archived_at },
                                label: row.archived_at
                                  ? "Restaurer la boutique"
                                  : "Archiver la boutique et bloquer ses accès, sans supprimer ses dossiers",
                              })
                            }
                          >
                            {row.archived_at ? (
                              <RotateCcw className="size-4" />
                            ) : (
                              <Archive className="size-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {["shops", "profiles"].includes(section) && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {row.archived_at ? "Archivé" : row.suspended_at ? "Suspendu" : "Actif"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={row.suspended_at ? "Réactiver" : "Suspendre"}
                            aria-label={row.suspended_at ? "Réactiver" : "Suspendre"}
                            onClick={() =>
                              setPending({
                                kind: section === "shops" ? "shop" : "member",
                                targetId: text(row.id),
                                changes: { suspended: !row.suspended_at },
                                label: row.suspended_at
                                  ? "Réactiver cet accès"
                                  : "Suspendre cet accès sans supprimer les données",
                              })
                            }
                          >
                            {row.suspended_at ? (
                              <Play className="size-4" />
                            ) : (
                              <Pause className="size-4" />
                            )}
                          </Button>
                        </>
                      )}
                      {section === "profiles" && (
                        <Select
                          value={text(
                            (row.user_roles as { role: string }[] | undefined)?.[0]?.role,
                          )}
                          onValueChange={(role: "admin" | "employee") =>
                            setPending({
                              kind: "member",
                              targetId: text(row.id),
                              changes: { role },
                              label: "Modifier le rôle de boutique",
                            })
                          }
                        >
                          <SelectTrigger
                            aria-label={`Rôle de ${text(row.full_name)}`}
                            className="w-36"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrateur</SelectItem>
                            <SelectItem value="employee">Employé</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="py-8 text-center text-muted-foreground">Aucun résultat.</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {list.data?.count ?? 0} résultats · Page {page + 1}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Page précédente"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Page suivante"
            disabled={(page + 1) * 20 >= (list.data?.count ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <Dialog
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails</DialogTitle>
          </DialogHeader>
          <dl className="space-y-3">
            {detail &&
              Object.entries(detail).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground">{labels[key] ?? key}</dt>
                  <dd className="break-all text-sm">
                    {typeof value === "object" && value !== null
                      ? JSON.stringify(value, null, 2)
                      : text(value)}
                  </dd>
                </div>
              ))}
          </dl>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coordonnées de la boutique</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (editing)
                mutate.mutate({
                  kind: "shop",
                  targetId: text(editing.id),
                  changes: { ...form, email: form.email || null },
                });
            }}
          >
            {(["name", "address", "phone", "email"] as const).map((key) => (
              <div key={key}>
                <Label htmlFor={`shop-${key}`}>{labels[key] ?? "Adresse"}</Label>
                <Input
                  id={`shop-${key}`}
                  value={form[key]}
                  required={key === "name"}
                  type={key === "email" ? "email" : "text"}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <Button disabled={mutate.isPending} type="submit">
              Enregistrer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setConfirmation("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la modification</DialogTitle>
          </DialogHeader>
          <p>{pending?.label}</p>
          <Label htmlFor="confirm">Saisissez CONFIRMER</Label>
          <Input
            id="confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <Button
            disabled={confirmation !== "CONFIRMER" || mutate.isPending}
            onClick={() => {
              if (pending)
                mutate.mutate({
                  kind: pending.kind,
                  targetId: pending.targetId,
                  changes: pending.changes,
                });
            }}
          >
            Confirmer
          </Button>
        </DialogContent>
      </Dialog>
      </>}
    </div>
  );
}
