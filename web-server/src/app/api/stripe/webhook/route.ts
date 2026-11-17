import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { markPaid } from "@/lib/purchases";
import { getStripe } from "@/lib/stripe";

// Webhook do Stripe: garante que a compra fica paga mesmo que o atleta feche a
// aba antes de voltar ao site (e cobre pagamentos assincronos). Idempotente: o
// Stripe reenvia eventos. Verifica a assinatura sobre o corpo CRU.
//   stripe listen --forward-to localhost:3001/api/stripe/webhook
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return new NextResponse("Bad request", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const purchaseId = session.metadata?.purchaseId;
    if (purchaseId && session.payment_status === "paid") {
      await markPaid(purchaseId, session.customer_details?.email ?? null);
    }
  }
  return NextResponse.json({ received: true });
}
