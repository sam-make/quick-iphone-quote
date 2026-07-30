import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
  const { data: workspace } = useWorkspace();
  const shopId = workspace?.shop.id;
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["rules"] });
    queryClient.invalidateQueries({ queryKey: ["shop-prices"] });
  };

  const [draft, setDraft] = useState({ name: "", deduction: "", category: "technique" as RuleCategory, blocking: false });

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

  if (workspace && workspace.role !== "admin") {
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
      </Tabs>
    </div>
  );
}