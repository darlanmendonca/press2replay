// Seed de DEV: cria o place "demo" (quadra "1", com cobranca de download
// ligada) e N replays de teste (video + spritesheet gerados com ffmpeg), pra
// abrir /replays/demo/1 sem precisar do edge. Sobe os arquivos pro Blob do
// .env.local e e re-executavel (substitui os replays seed anteriores).
//   npm run db:seed
// Contra outro ambiente (ex.: preview): ENV_FILE=.env.preview npm run db:seed
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { court, replay, venue } from "../src/db/schema";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env.local");
} catch {}

const VENUE = "demo";
const COURT = "1";
const COUNT = 3;
const SECONDS = 8;
const FRAMES = 8;
const COLUMNS = 4;
// Mesmos caminhos de src/lib/storage.ts (nao importado: ele usa `server-only`).
const videoPathname = (v: string, c: string, cam: string, id: string) => `replays/${v}/${c}/${cam}/${id}.mp4`;
const spritePathname = (v: string, c: string, cam: string, id: string) => `replays/${v}/${c}/${cam}/${id}.jpg`;
const SOURCES = ["testsrc2", "smptebars", "rgbtestsrc"];

function ffmpeg(...args: string[]) {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
}

async function main() {
  await db
    .insert(venue)
    .values({ id: VENUE, name: "Demo Arena", requireDownloadPayment: true })
    .onConflictDoUpdate({ target: venue.id, set: { requireDownloadPayment: true } });
  await db
    .insert(court)
    .values({ venueId: VENUE, id: COURT, name: "Quadra 1", sport: "padel" })
    .onConflictDoNothing();
  await db.delete(replay).where(and(eq(replay.venueId, VENUE), eq(replay.courtId, COURT)));

  const dir = mkdtempSync(join(tmpdir(), "p2r-seed-"));
  for (let i = 0; i < COUNT; i++) {
    const id = randomUUID();
    const mp4 = join(dir, `${id}.mp4`);
    const jpg = join(dir, `${id}.jpg`);
    ffmpeg(
      "-f", "lavfi", "-i", `${SOURCES[i % SOURCES.length]}=size=640x360:rate=25:duration=${SECONDS}`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4,
    );
    ffmpeg("-i", mp4, "-vf", `fps=${FRAMES / SECONDS},scale=320:180,tile=${COLUMNS}x${FRAMES / COLUMNS}`, "-frames:v", "1", jpg);

    const videoPath = videoPathname(VENUE, COURT, "main", id);
    const spritePath = spritePathname(VENUE, COURT, "main", id);
    await put(videoPath, readFileSync(mp4), { access: "private", contentType: "video/mp4", allowOverwrite: true });
    await put(spritePath, readFileSync(jpg), { access: "private", contentType: "image/jpeg", allowOverwrite: true });

    const createdAt = new Date(Date.now() - i * 10 * 60_000); // um a cada 10 min
    await db.insert(replay).values({
      id,
      venueId: VENUE,
      courtId: COURT,
      sport: "padel",
      videoPath,
      spritePath,
      spriteFrames: FRAMES,
      spriteColumns: COLUMNS,
      durationSeconds: SECONDS,
      sizeBytes: statSync(mp4).size,
      createdAt,
      expiresAt: new Date(Date.now() + 24 * 3600_000), // 24h: nao expira a meio do teste
    });
    console.log(`replay ${i + 1}/${COUNT}: ${id}`);
  }
  console.log(`\nPronto: http://localhost:3001/replays/${VENUE}/${COURT}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
