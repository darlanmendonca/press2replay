import { NextResponse, type NextRequest } from "next/server";
import { grantAccess } from "@/lib/access";
import { getPurchaseBySession, markPaid } from "@/lib/purchases";
import { getStripe } from "@/lib/stripe";

// Chamada pela pagina de retorno do Checkout (?session_id=...). O session_id so
// o comprador tem (veio na URL de retorno do Stripe). Confirma o pagamento
// direto no Stripe (nao depende da pressa do webhook), marca a compra paga e
// grava o cookie de acesso neste dispositivo.
//   -> { status: "paid" | "pending" | "failed" }
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]{10,200}$/.test(sessionId)) {
    return NextResponse.json({ status: "failed" }, { status: 400 });
  }
  const found = await getPurchaseBySession(sessionId);
  if (!found) return NextResponse.json({ status: "failed" }, { status: 404 });

  let paid = found.status === "paid";
  if (!paid) {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "paid") {
      await markPaid(found.id, session.customer_details?.email ?? null);
      paid = true;
    } else if (session.status === "expired") {
      return NextResponse.json({ status: "failed" });
    }
  }
  if (!paid) return NextResponse.json({ status: "pending" });

  await grantAccess(found.id);
  return NextResponse.json({ status: "paid" });
}
