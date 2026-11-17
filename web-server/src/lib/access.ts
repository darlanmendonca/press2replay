import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { listPaidPurchases } from "@/lib/purchases";
import type { Purchase } from "@/db/schema";

// Prova de compra do atleta, sem conta: um cookie assinado (HMAC) com os ids das
// compras pagas neste dispositivo. O cookie sozinho nao da acesso: cada pedido
// reconfere as compras no banco (status paid + cobertura do replay).
const COOKIE = "p2r_access";
const MAX_AGE_S = 30 * 24 * 3600;
const MAX_IDS = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function secret() {
  const s = process.env.ACCESS_COOKIE_SECRET ?? process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error("ACCESS_COOKIE_SECRET (ou BETTER_AUTH_SECRET) nao configurada");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function parse(value: string | undefined) {
  if (!value) return [];
  const i = value.lastIndexOf(".");
  if (i < 0) return [];
  const payload = value.slice(0, i);
  const given = Buffer.from(value.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return [];
  return payload.split(",").filter((id) => UUID.test(id));
}

// Chame num Route Handler / Server Action (so ali da pra escrever cookie).
export async function grantAccess(purchaseId: string) {
  const store = await cookies();
  const ids = [purchaseId, ...parse(store.get(COOKIE)?.value).filter((id) => id !== purchaseId)];
  const payload = ids.slice(0, MAX_IDS).join(",");
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

// Compras pagas deste dispositivo (revalidadas no banco).
export async function getMyPurchases(): Promise<Purchase[]> {
  const store = await cookies();
  return listPaidPurchases(parse(store.get(COOKIE)?.value));
}
