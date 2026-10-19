import { NextResponse } from "next/server";
import { purgeExpired } from "@/lib/replays";

// Cron diario (vercel.json): apaga do storage e do banco os replays expirados.
// A Vercel manda `Authorization: Bearer $CRON_SECRET` quando CRON_SECRET existe.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await purgeExpired()) });
}
