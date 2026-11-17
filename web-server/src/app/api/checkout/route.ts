import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { purchase } from "@/db/schema";
import { CURRENCY, PACK_PRICE_CENTS, SINGLE_PRICE_CENTS } from "@/lib/pricing";
import { getActiveReplay } from "@/lib/replays";
import { getStripe, StripeNotConfiguredError } from "@/lib/stripe";
import { ID_PATTERN } from "@/lib/storage";
import { getCourt, getVenue } from "@/lib/venues";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

// Cria a Checkout Session (pagina hospedada do Stripe) de um download pago.
// Publica (checkout de convidado). Nada do que vem do browser define preco ou
// escopo: o valor e o do servidor (pricing.ts) e so se cobra em place com
// `requireDownloadPayment`, por replay ainda valido daquela quadra.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    plan?: unknown;
    venueId?: unknown;
    courtId?: unknown;
    replayId?: unknown;
    consent?: unknown;
  } | null;
  if (!body) return bad("Pedido inválido.");

  const { plan, venueId, courtId, replayId } = body;
  if (plan !== "single" && plan !== "pack") return bad("Plano inválido.");
  if (typeof venueId !== "string" || !ID_PATTERN.test(venueId)) return bad("Local inválido.");
  if (typeof courtId !== "string" || !ID_PATTERN.test(courtId)) return bad("Quadra inválida.");
  if (body.consent !== true) return bad("É preciso aceitar as condições para continuar.");

  const [venue, court] = await Promise.all([getVenue(venueId), getCourt(venueId, courtId)]);
  if (!venue || !court) return bad("Quadra não encontrada.", 404);
  if (!venue.requireDownloadPayment) return bad("Este local não cobra downloads.");

  if (plan === "single") {
    if (typeof replayId !== "string" || !UUID.test(replayId)) return bad("Replay inválido.");
    const replay = await getActiveReplay(replayId);
    if (!replay || replay.venueId !== venueId || replay.courtId !== courtId) {
      return bad("Replay não encontrado ou já expirado.", 404);
    }
  }

  const amountCents = plan === "single" ? SINGLE_PRICE_CENTS : PACK_PRICE_CENTS;
  const purchaseId = randomUUID();
  const base = process.env.APP_URL ?? request.nextUrl.origin;
  const back = `${base}/replays/${venueId}/${courtId}`;

  let session;
  try {
    session = await getStripe().checkout.sessions.create({
      mode: "payment",
      locale: "pt",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: amountCents,
            product_data: {
              name: plan === "single" ? "Download de replay" : "Pacote de replays",
              description:
                plan === "single"
                  ? `${court.name} · ${venue.name}`
                  : `Todos os replays de ${court.name} · ${venue.name}`,
            },
          },
        },
      ],
      metadata: { purchaseId },
      payment_intent_data: { metadata: { purchaseId } },
      success_url: `${back}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${back}?checkout=cancelled`,
    });
  } catch (err) {
    if (err instanceof StripeNotConfiguredError) return bad("Pagamentos indisponíveis.", 503);
    console.error("[checkout] stripe error", err);
    return bad("Não foi possível iniciar o pagamento. Tente novamente.", 502);
  }
  if (!session.url) return bad("Não foi possível iniciar o pagamento.", 502);

  await db.insert(purchase).values({
    id: purchaseId,
    stripeSessionId: session.id,
    plan,
    venueId,
    courtId,
    replayId: plan === "single" ? (replayId as string) : null,
    amountCents,
    currency: CURRENCY,
    consentAt: new Date(),
  });

  return NextResponse.json({ url: session.url });
}
