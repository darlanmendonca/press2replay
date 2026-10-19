import "server-only";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { replay } from "@/db/schema";
import { listObjectsUploadedBefore, removeObjects } from "@/lib/storage";

const MINUTE_MS = 60_000;

// Quanto tempo o replay fica disponivel (listagem e download). Fonte da
// verdade: `replay.expiresAt`, checado em toda leitura. O cron diario so
// recupera espaco no storage - o video pode ficar la horas depois de expirar,
// mas o app nao o lista nem o serve (o storage e privado).
export const REPLAY_TTL_MINUTES = Number(process.env.REPLAY_TTL_MINUTES) || 120;

export function expiryFrom(createdAt: Date) {
  return new Date(createdAt.getTime() + REPLAY_TTL_MINUTES * MINUTE_MS);
}

// Replays da quadra (dentro do local) ainda dentro do TTL (ultimas 2h), do mais
// novo pro mais antigo.
export async function listRecentReplays(venueId: string, courtId: string, now = new Date()) {
  return db
    .select()
    .from(replay)
    .where(
      and(
        eq(replay.venueId, venueId),
        eq(replay.courtId, courtId),
        gt(replay.expiresAt, now),
      ),
    )
    .orderBy(desc(replay.createdAt));
}

// Replay ainda valido (nao expirado), ou null.
export async function getActiveReplay(id: string, now = new Date()) {
  const [row] = await db
    .select()
    .from(replay)
    .where(and(eq(replay.id, id), gt(replay.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

// Apaga do storage e do banco o que expirou, e varre sobras orfas do storage.
// Roda no cron diario (unico intervalo permitido no plano Hobby).
export async function purgeExpired(now = new Date()) {
  const expired = await db.select().from(replay).where(lt(replay.expiresAt, now));
  if (expired.length > 0) {
    // Storage primeiro: se falhar, as linhas ficam e a proxima rodada tenta de novo.
    await removeObjects(
      expired.flatMap((r) => (r.spritePath ? [r.videoPath, r.spritePath] : [r.videoPath])),
    );
    for (const r of expired) await db.delete(replay).where(eq(replay.id, r.id));
  }

  // Objetos com mais de TTL + 1h que nao foram registrados nem apagados.
  const orphanCutoff = new Date(now.getTime() - (REPLAY_TTL_MINUTES + 60) * MINUTE_MS);
  const orphans = await listObjectsUploadedBefore(orphanCutoff);
  await removeObjects(orphans);

  return { replays: expired.length, orphans: orphans.length };
}
