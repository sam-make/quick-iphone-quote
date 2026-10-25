import { loadStripe, type Stripe } from '@stripe/stripe-js';
let promise: Promise<Stripe | null> | null=null;
export function getTestStripe() {
  const token=import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if(!token?.startsWith('pk_test_')) throw new Error('Les paiements de test ne sont pas configurés pour cette version.');
  if(!promise) promise=loadStripe(token);
  return promise;
}
