import { NextResponse } from "next/server";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { contactRequest } from "@/db/schema";
import { purgeExpired } from "@/lib/replays";

// Pedidos de contacto: guardados 12 meses (ver /privacidade).
const CONTACT_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

// Cron diario (vercel.json): apaga do storage e do banco os replays expirados.
// A Vercel manda `Authorization: Bearer $CRON_SECRET` quando CRON_SECRET existe.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const contactsDeleted = await db
    .delete(contactRequest)
    .where(lt(contactRequest.createdAt, new Date(Date.now() - CONTACT_RETENTION_MS)))
    .returning({ id: contactRequest.id });
  return NextResponse.json({ ok: true, ...(await purgeExpired()), contactsDeleted: contactsDeleted.length });
}
