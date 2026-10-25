import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Dupliqué avec stripe.server.ts pour éviter tout import croisé client/serveur.
export type StripeEnv = "sandbox" | "live";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

// L'environnement se déduit du PRÉFIXE de la clé publique, jamais d'un défaut :
// une clé absente ou inconnue est une erreur de configuration, pas un basculement
// silencieux vers la production.
export function getStripeEnvironment(): StripeEnv {
  if (clientToken?.startsWith("pk_test_")) return "sandbox";
  if (clientToken?.startsWith("pk_live_")) return "live";
  throw new Error(
    "Les paiements ne sont pas configurés pour cette version de l'application.",
  );
}

let promise: Promise<Stripe | null> | null = null;
export function getStripe() {
  getStripeEnvironment();
  if (!promise) promise = loadStripe(clientToken as string);
  return promise;
}
