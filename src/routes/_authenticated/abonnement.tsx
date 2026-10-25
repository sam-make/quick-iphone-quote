import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { CreditCard, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import {
  createCheckout,
  createPortal,
  getShopSubscription,
} from "@/lib/payments.functions";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { hasSubscriptionAccess } from "@/lib/subscription";
import { useWorkspace } from "@/hooks/useWorkspace";
const options = queryOptions({
  queryKey: ["shop-subscription"],
  queryFn: () => getShopSubscription({ data: { environment: getStripeEnvironment() } }),
  refetchInterval: 5000,
});
export const Route = createFileRoute("/_authenticated/abonnement")({
  head: () => ({
    meta: [
      { title: "Abonnement — Trade-In Pro" },
      {
        name: "description",
        content: "Abonnement unique Trade-In Pro à 10,99 EUR/mois, toutes fonctionnalités incluses.",
      },
      { property: "og:title", content: "Abonnement — Trade-In Pro" },
      {
        property: "og:description",
        content: "Gestion de l’abonnement et du statut de votre boutique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(options),
  component: SubscriptionPage,
});
function SubscriptionPage() {
  const { data: rows } = useSuspenseQuery(options);
  const { data: workspace } = useWorkspace();
  const sub = rows.find((s) => hasSubscriptionAccess(s)) ?? rows[0] ?? null;
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkout = useServerFn(createCheckout);
  const portal = useServerFn(createPortal);
  const qc = useQueryClient();
  const purchase = useMutation({
    mutationFn: async () => {
      getStripe();
      const r = await checkout({ data: { environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      return r.clientSecret;
    },
    onSuccess: (s) => {
      setError(null);
      setSecret(s);
    },
    onError: (e) => setError(e.message),
  });
  const manage = useMutation({
    mutationFn: async () => {
      const r = await portal({ data: { environment: "sandbox" } });
      if ("error" in r) throw new Error(r.error);
      return r.url;
    },
    onSuccess: (url) => {
      setError(null);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: (e) => setError(e.message),
  });
  const labels: Record<string, string> = {
    active: "Actif",
    trialing: "Période d’essai",
    past_due: "Paiement à régulariser",
    canceled: "Résilié",
    incomplete: "Paiement incomplet",
    incomplete_expired: "Paiement expiré",
    unpaid: "Impayé",
    paused: "Suspendu",
  };
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PaymentTestModeBanner />
      <div>
        <h1 className="text-3xl font-semibold text-ink">Abonnement Trade-In Pro</h1>
        <p className="mt-2 text-muted-foreground">
          Toutes les fonctionnalités incluses pour votre boutique.
        </p>
      </div>
      <section className="border-y border-border py-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-4xl font-semibold text-ink">
              10,99 €{" "}
              <span className="text-base font-normal text-muted-foreground">
                /mois, taxes incluses
              </span>
            </p>
            <p className="mt-3 text-sm">
              Statut test :{" "}
              <strong>{sub ? (labels[sub.status] ?? sub.status) : "Aucun abonnement"}</strong>
            </p>
            {sub?.current_period_end && (
              <p className="mt-2 text-sm text-muted-foreground">
                {sub.cancel_at_period_end || sub.status === "canceled"
                  ? "Fin d’accès"
                  : "Fin de période"}{" "}
                : {new Date(sub.current_period_end).toLocaleDateString("fr-FR")}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {hasSubscriptionAccess(sub)
                ? "Période de test valide."
                : "Aucune période payée de test valide."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["test-subscription"] })}
          >
            <RefreshCw className="size-4" />
            Actualiser le statut
          </Button>
        </div>
        {workspace?.role === "admin" ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {!hasSubscriptionAccess(sub) && (
              <Button
                disabled={purchase.isPending || Boolean(secret)}
                onClick={() => purchase.mutate()}
              >
                {purchase.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Souscrire en test
              </Button>
            )}
            <Button variant="outline" disabled={manage.isPending} onClick={() => manage.mutate()}>
              <ExternalLink className="size-4" />
              Portail client test
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            L’administrateur gère l’abonnement de la boutique.
          </p>
        )}
      </section>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {secret && (
        <EmbeddedCheckoutProvider stripe={getTestStripe()} options={{ clientSecret: secret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
      <p className="text-sm text-muted-foreground">
        Le retour du paiement ne confirme pas l’abonnement : le statut affiché provient des
        notifications vérifiées. Les accès actuels restent inchangés pendant la préparation au
        lancement.
      </p>
    </div>
  );
}
