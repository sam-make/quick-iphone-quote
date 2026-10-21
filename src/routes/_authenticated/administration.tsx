import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatEuro,
  formatStorage,
  storageStep,
  type DeductionRule,
  type RuleCategory,
} from "@/lib/pricing";
import type { RepairService } from "@/lib/repairs";
import {
  changeEmployeeRole,
  deleteEmployee,
  fetchMembers,
  inviteEmployee,
  updateShopSettings,
} from "@/lib/team.functions";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/administration")({
  head: () => ({
    meta: [
      { title: "Administration — ReprisePro" },
      { name: "description", content: "Gérez vos règles de déduction, vos prix de base et les infos de la boutique." },
      { property: "og:title", content: "Administration — ReprisePro" },
      { property: "og:description", content: "Règles de déduction 100 % personnalisables par boutique." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const workspaceQuery = useWorkspace();
  const workspace = workspaceQuery.data;
  const shopId = workspace?.shop.id;
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["rules"] });
    queryClient.invalidateQueries({ queryKey: ["shop-prices"] });
  };

  const [draft, setDraft] = useState({ name: "", deduction: "", category: "technique" as RuleCategory, blocking: false });
  const [shopForm, setShopForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", fullName: "", role: "employee" as "admin" | "employee" });

  useEffect(() => {
    if (!workspace) return;
    setShopForm({
      name: workspace.shop.name ?? "",
      address: workspace.shop.address ?? "",
      phone: workspace.shop.phone ?? "",
      email: workspace.shop.email ?? "",
    });
  }, [workspace?.shop.id, workspace?.shop.name, workspace?.shop.address, workspace?.shop.phone, workspace?.shop.email]);

  const saveShopFn = useServerFn(updateShopSettings);
  const membersFn = useServerFn(fetchMembers);
  const inviteFn = useServerFn(inviteEmployee);
  const roleFn = useServerFn(changeEmployeeRole);
  const removeFn = useServerFn(deleteEmployee);

  const saveShop = useMutation({
    mutationFn: () =>
      saveShopFn({
        data: {
          name: shopForm.name.trim(),
          address: shopForm.address.trim() || null,
          phone: shopForm.phone.trim() || null,
          email: shopForm.email.trim() || "",
        },
      }),
    onSuccess: () => {
      toast.success("Boutique mise à jour.");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (error: Error) => toast.error(error.message || "Enregistrement impossible."),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", shopId],
    enabled: Boolean(shopId) && workspace?.role === "admin",
    queryFn: () => membersFn({ data: undefined }),
  });

  const refreshMembers = () => queryClient.invalidateQueries({ queryKey: ["members"] });

  const invite = useMutation({
    mutationFn: () =>
      inviteFn({
        data: {
          email: inviteForm.email.trim(),
          fullName: inviteForm.fullName.trim(),
          role: inviteForm.role,
          redirectTo: `${window.location.origin}/reset-password`,
        },
      }),
    onSuccess: () => {
      setInviteForm({ email: "", fullName: "", role: "employee" });
      toast.success("Invitation envoyée par e-mail.");
      refreshMembers();
    },
    onError: (error: Error) => toast.error(error.message || "Invitation impossible."),
  });

  const setRole = useMutation({
    mutationFn: (data: { memberId: string; role: "admin" | "employee" }) => roleFn({ data }),
    onSuccess: () => {
      toast.success("Rôle mis à jour.");
      refreshMembers();
    },
    onError: (error: Error) => toast.error(error.message || "Modification impossible."),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => removeFn({ data: { memberId } }),
    onSuccess: () => {
      toast.success("Employé supprimé.");
      refreshMembers();
    },
    onError: (error: Error) => toast.error(error.message || "Suppression impossible."),
  });
  const [serviceDraft, setServiceDraft] = useState({
    name: "",
    price: "",
    duration: "",
    category: "autre",
    description: "",
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["admin-rules", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deduction_rules")
        .select("id, name, category, deduction, is_blocking, active, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as DeductionRule[];
    },
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const { data } = await supabase
        .from("device_models")
        .select("id, name, storages, base_price")
        .order("sort_order");
      return (data ?? []) as { id: string; name: string; storages: number[]; base_price: number }[];
    },
  });

  const { data: prices = [] } = useQuery({
    queryKey: ["admin-prices", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const { data } = await supabase.from("shop_prices").select("id, model_id, storage_gb, base_price").eq("color", "*");
      return (data ?? []) as { id: string; model_id: string; storage_gb: number; base_price: number }[];
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services", shopId],
    enabled: Boolean(shopId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repair_services")
        .select("id, name, price, duration_minutes, category, description, active, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as RepairService[];
    },
  });

  const refreshServices = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    queryClient.invalidateQueries({ queryKey: ["repair-services"] });
  };

  const addService = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("repair_services").insert({
        shop_id: shopId!,
        name: serviceDraft.name.trim(),
        price: Number(serviceDraft.price || 0),
        duration_minutes: Number(serviceDraft.duration || 0),
        category: serviceDraft.category.trim() || "autre",
        description: serviceDraft.description.trim() || null,
        sort_order: 500,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setServiceDraft({ name: "", price: "", duration: "", category: "autre", description: "" });
      toast.success("Prestation ajoutée.");
      refreshServices();
    },
    onError: () => toast.error("Ajout impossible."),
  });

  const updateService = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<RepairService, "name" | "price" | "duration_minutes" | "category" | "description" | "active">>;
    }) => {
      const { error } = await supabase.from("repair_services").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refreshServices,
    onError: () => toast.error("Modification impossible."),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("repair_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prestation supprimée.");
      refreshServices();
    },
    onError: () => toast.error("Suppression impossible."),
  });

  const refreshRules = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-rules"] });
    invalidate();
  };

  const addRule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deduction_rules").insert({
        shop_id: shopId!,
        name: draft.name.trim(),
        category: draft.category,
        deduction: draft.blocking ? 0 : Number(draft.deduction || 0),
        is_blocking: draft.blocking,
        sort_order: 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft({ name: "", deduction: "", category: "technique", blocking: false });
      toast.success("Règle ajoutée.");
      refreshRules();
    },
    onError: () => toast.error("Ajout impossible."),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { name?: string; deduction?: number; active?: boolean } }) => {
      const { error } = await supabase.from("deduction_rules").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refreshRules,
    onError: () => toast.error("Modification impossible."),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deduction_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Règle supprimée.");
      refreshRules();
    },
  });

  const savePrice = useMutation({
    mutationFn: async ({ modelId, storage, value }: { modelId: string; storage: number; value: number }) => {
      const { error } = await supabase.from("shop_prices").upsert(
        { shop_id: shopId!, model_id: modelId, color: "*", storage_gb: storage, base_price: value },
        { onConflict: "shop_id,model_id,color,storage_gb" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prix enregistré.");
      queryClient.invalidateQueries({ queryKey: ["admin-prices"] });
      invalidate();
    },
    onError: () => toast.error("Enregistrement impossible."),
  });

  if (workspaceQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement de la boutique…</p>;
  }
  if (workspaceQuery.isError || !workspace) {
    return (
      <div role="alert" className="space-y-3 text-sm">
        <p className="text-destructive">Impossible de vérifier vos droits d'accès pour le moment.</p>
        <Button size="sm" variant="outline" onClick={() => workspaceQuery.refetch()}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (workspace.role !== "admin") {
    return <p className="text-sm text-muted-foreground">Accès réservé à l'administrateur de la boutique.</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink md:text-3xl">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos règles de déduction et vos prix de base pilotent entièrement le moteur de calcul.
        </p>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Règles de déduction</TabsTrigger>
          <TabsTrigger value="prices">Prix de base</TabsTrigger>
          <TabsTrigger value="services">Prestations</TabsTrigger>
          <TabsTrigger value="shop">Boutique</TabsTrigger>
          <TabsTrigger value="team">Employés</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="text-base font-semibold text-ink">Ajouter une règle</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_140px_160px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Nom</Label>
                <Input
                  id="rule-name"
                  value={draft.name}
                  maxLength={80}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Micro faible"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-deduction">Déduction (€)</Label>
                <Input
                  id="rule-deduction"
                  type="number"
                  min={0}
                  disabled={draft.blocking}
                  value={draft.deduction}
                  onChange={(event) => setDraft((prev) => ({ ...prev, deduction: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-category">Catégorie</Label>
                <select
                  id="rule-category"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      category: event.target.value as RuleCategory,
                      blocking: event.target.value === "blocage",
                    }))
                  }
                >
                  {CATEGORY_ORDER.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={() => addRule.mutate()} disabled={!draft.name.trim() || addRule.isPending}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
          </section>

          {CATEGORY_ORDER.map((category) => {
            const items = rules.filter((rule) => rule.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category} className="surface-card overflow-hidden">
                <h3 className="border-b border-border px-6 py-4 text-sm font-semibold text-ink">
                  {CATEGORY_LABELS[category]}
                </h3>
                <ul className="divide-y divide-border">
                  {items.map((rule) => (
                    <li key={rule.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                      <Input
                        className="h-9 max-w-xs flex-1"
                        defaultValue={rule.name}
                        onBlur={(event) => {
                          const value = event.target.value.trim();
                          if (value && value !== rule.name) {
                            updateRule.mutate({ id: rule.id, patch: { name: value } });
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-9 w-24"
                          type="number"
                          min={0}
                          disabled={rule.is_blocking}
                          defaultValue={Number(rule.deduction)}
                          onBlur={(event) => {
                            const value = Number(event.target.value);
                            if (!Number.isNaN(value) && value !== Number(rule.deduction)) {
                              updateRule.mutate({ id: rule.id, patch: { deduction: value } });
                            }
                          }}
                        />
                        <span className="text-sm text-muted-foreground">€</span>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{rule.active ? "Active" : "Inactive"}</span>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={(value) => updateRule.mutate({ id: rule.id, patch: { active: value } })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="prices" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Laissez vide pour utiliser le prix de référence du catalogue. Un prix défini ici remplace le prix de base
            pour toutes les couleurs du modèle.
          </p>
          {models.map((model) => (
            <section key={model.id} className="surface-card p-5">
              <h3 className="text-sm font-semibold text-ink">{model.name}</h3>
              <div className="mt-3 flex flex-wrap gap-4">
                {model.storages.map((storage) => {
                  const override = prices.find((row) => row.model_id === model.id && row.storage_gb === storage);
                  const fallback = Number(model.base_price) + storageStep(storage);
                  return (
                    <div key={storage} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{formatStorage(storage)}</Label>
                      <Input
                        className="h-9 w-28"
                        type="number"
                        min={0}
                        placeholder={String(fallback)}
                        defaultValue={override ? Number(override.base_price) : ""}
                        onBlur={(event) => {
                          const value = Number(event.target.value);
                          if (event.target.value === "" || Number.isNaN(value)) return;
                          if (override && value === Number(override.base_price)) return;
                          savePrice.mutate({ modelId: model.id, storage, value });
                        }}
                      />
                      <p className="text-[11px] text-muted-foreground">Réf. {formatEuro(fallback)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="text-base font-semibold text-ink">Nouvelle prestation</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px_120px_140px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="service-name">Titre</Label>
                <Input
                  id="service-name"
                  value={serviceDraft.name}
                  maxLength={80}
                  placeholder="Remplacement écran"
                  onChange={(event) => setServiceDraft((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-price">Prix (€)</Label>
                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  value={serviceDraft.price}
                  onChange={(event) => setServiceDraft((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-duration">Durée (min)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min={0}
                  value={serviceDraft.duration}
                  onChange={(event) => setServiceDraft((prev) => ({ ...prev, duration: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-category">Catégorie</Label>
                <Input
                  id="service-category"
                  value={serviceDraft.category}
                  maxLength={40}
                  placeholder="ecran"
                  onChange={(event) => setServiceDraft((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
              <Button onClick={() => addService.mutate()} disabled={!serviceDraft.name.trim() || addService.isPending}>
                <Plus className="size-4" />
                Ajouter
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="service-description">Description (optionnelle)</Label>
              <Input
                id="service-description"
                value={serviceDraft.description}
                maxLength={200}
                onChange={(event) => setServiceDraft((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </section>

          <section className="surface-card overflow-hidden">
            <h3 className="border-b border-border px-6 py-4 text-sm font-semibold text-ink">
              Catalogue de prestations ({services.length})
            </h3>
            <ul className="divide-y divide-border">
              {services.map((service) => (
                <li key={service.id} className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_110px_110px_130px_auto] md:items-center">
                  <Input
                    className="h-9"
                    defaultValue={service.name}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value && value !== service.name) updateService.mutate({ id: service.id, patch: { name: value } });
                    }}
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-9 w-full"
                      type="number"
                      min={0}
                      defaultValue={Number(service.price)}
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isNaN(value) && value !== Number(service.price)) {
                          updateService.mutate({ id: service.id, patch: { price: value } });
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-9 w-full"
                      type="number"
                      min={0}
                      defaultValue={service.duration_minutes}
                      onBlur={(event) => {
                        const value = Number(event.target.value);
                        if (!Number.isNaN(value) && value !== service.duration_minutes) {
                          updateService.mutate({ id: service.id, patch: { duration_minutes: value } });
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                  <Input
                    className="h-9"
                    defaultValue={service.category}
                    onBlur={(event) => {
                      const value = event.target.value.trim();
                      if (value && value !== service.category) {
                        updateService.mutate({ id: service.id, patch: { category: value } });
                      }
                    }}
                  />
                  <div className="flex items-center gap-3 md:justify-end">
                    <span className="text-xs text-muted-foreground">{service.active ? "Active" : "Inactive"}</span>
                    <Switch
                      checked={service.active}
                      onCheckedChange={(value) => updateService.mutate({ id: service.id, patch: { active: value } })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer la prestation"
                      onClick={() => deleteService.mutate(service.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            {services.length === 0 && (
              <p className="px-6 py-6 text-sm text-muted-foreground">Aucune prestation pour le moment.</p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="shop" className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="text-base font-semibold text-ink">Paramètres de la boutique</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ces informations apparaissent sur vos factures et documents client.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shop-name">Nom</Label>
                <Input
                  id="shop-name"
                  value={shopForm.name}
                  maxLength={120}
                  onChange={(event) => setShopForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-phone">Téléphone</Label>
                <Input
                  id="shop-phone"
                  value={shopForm.phone}
                  maxLength={40}
                  onChange={(event) => setShopForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shop-email">E-mail</Label>
                <Input
                  id="shop-email"
                  type="email"
                  value={shopForm.email}
                  maxLength={160}
                  onChange={(event) => setShopForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="shop-address">Adresse</Label>
                <Input
                  id="shop-address"
                  value={shopForm.address}
                  maxLength={300}
                  onChange={(event) => setShopForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>
            </div>
            <Button
              className="mt-5"
              onClick={() => saveShop.mutate()}
              disabled={shopForm.name.trim().length < 2 || saveShop.isPending}
            >
              Enregistrer
            </Button>
          </section>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <section className="surface-card p-6">
            <h2 className="text-base font-semibold text-ink">Inviter un employé</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              L'employé reçoit un e-mail d'invitation pour définir son mot de passe et rejoint automatiquement votre
              boutique.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nom complet</Label>
                <Input
                  id="invite-name"
                  value={inviteForm.fullName}
                  maxLength={120}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">E-mail</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  maxLength={160}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Rôle</Label>
                <select
                  id="invite-role"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={inviteForm.role}
                  onChange={(event) =>
                    setInviteForm((prev) => ({ ...prev, role: event.target.value as "admin" | "employee" }))
                  }
                >
                  <option value="employee">Employé</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <Button
                onClick={() => invite.mutate()}
                disabled={!inviteForm.email.trim() || inviteForm.fullName.trim().length < 2 || invite.isPending}
              >
                <UserPlus className="size-4" />
                Inviter
              </Button>
            </div>
          </section>

          <section className="surface-card overflow-hidden">
            <h3 className="border-b border-border px-6 py-4 text-sm font-semibold text-ink">
              Équipe ({members.length})
            </h3>
            <ul className="divide-y divide-border">
              {members.map((member) => {
                const isSelf = member.id === workspace?.profile.id;
                return (
                  <li key={member.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {member.full_name}
                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(vous)</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.email ?? "—"}</p>
                    </div>
                    <select
                      aria-label="Rôle"
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={member.role}
                      disabled={isSelf || setRole.isPending}
                      onChange={(event) =>
                        setRole.mutate({ memberId: member.id, role: event.target.value as "admin" | "employee" })
                      }
                    >
                      <option value="employee">Employé</option>
                      <option value="admin">Administrateur</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Supprimer l'employé"
                      disabled={isSelf || removeMember.isPending}
                      onClick={() => removeMember.mutate(member.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
            {members.length === 0 && (
              <p className="px-6 py-6 text-sm text-muted-foreground">Aucun employé pour le moment.</p>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}