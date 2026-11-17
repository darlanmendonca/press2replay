import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { purchase, type Purchase, type Replay } from "@/db/schema";
import { REPLAY_TTL_MINUTES } from "@/lib/replays";

export async function getPurchaseBySession(stripeSessionId: string) {
  const [row] = await db
    .select()
    .from(purchase)
    .where(eq(purchase.stripeSessionId, stripeSessionId))
    .limit(1);
  return row ?? null;
}

export async function listPaidPurchases(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(purchase)
    .where(and(inArray(purchase.id, ids), eq(purchase.status, "paid")));
}

// Marca como paga (idempotente: o webhook e a consulta de status podem chegar
// os dois, em qualquer ordem). Devolve a compra ja paga.
export async function markPaid(purchaseId: string, email: string | null) {
  await db
    .update(purchase)
    .set({ status: "paid", paidAt: new Date(), email })
    .where(and(eq(purchase.id, purchaseId), eq(purchase.status, "pending")));
  const [row] = await db.select().from(purchase).where(eq(purchase.id, purchaseId)).limit(1);
  return row ?? null;
}

// Uma compra cobre o replay? "single": so aquele. "pack": todos da quadra que ja
// existiam ao pagar mais os criados ate TTL depois (a janela em que o atleta
// ainda esta a jogar); o proprio replay continua a expirar no seu `expiresAt`.
export function purchaseCovers(p: Purchase, r: Pick<Replay, "id" | "venueId" | "courtId" | "createdAt">) {
  if (p.status !== "paid" || !p.paidAt) return false;
  if (p.plan === "single") return p.replayId === r.id;
  if (p.plan === "pack") {
    const packEnds = p.paidAt.getTime() + REPLAY_TTL_MINUTES * 60_000;
    return p.venueId === r.venueId && p.courtId === r.courtId && r.createdAt.getTime() <= packEnds;
  }
  return false;
}
