import "server-only";
import Stripe from "stripe";

// Cliente Stripe preguicoso: sem STRIPE_SECRET_KEY o app sobe normalmente (os
// places sem cobranca nao precisam dele) e so as rotas de pagamento falham.
let client: Stripe | undefined;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeNotConfiguredError();
  return (client ??= new Stripe(key));
}

export class StripeNotConfiguredError extends Error {
  constructor() {
    super("STRIPE_SECRET_KEY nao configurada (ver web-server/.env.example)");
  }
}
