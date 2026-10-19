import { NextResponse } from "next/server";
import { db } from "@/db";
import { replay } from "@/db/schema";
import { authenticateEdge } from "@/lib/edge-auth";
import { expiryFrom } from "@/lib/replays";
import { parseSport, SPORTS } from "@/lib/sports";
import { ID_PATTERN, spritePathname, statObject, videoPathname } from "@/lib/storage";
import { getCourt } from "@/lib/venues";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function positiveInt(value: unknown) {
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : null;
}

// Segundo passo do envio do edge: depois de subir o mp4 (e o sprite) direto
// pro Blob, ele registra o replay aqui. O local vem da CHAVE (o venueId do corpo
// so e conferido contra ela), a quadra tem de existir nesse local, os caminhos
// no storage sao derivados de venueId + courtId + replayId (nao vem do
// cliente) e a existencia dos arquivos e confirmada antes de criar a linha.
export async function POST(request: Request) {
  const edge = await authenticateEdge(request);
  if (!edge) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const id = typeof body?.replayId === "string" && UUID.test(body.replayId) ? body.replayId : null;
  const venueId = typeof body?.venueId === "string" && ID_PATTERN.test(body.venueId) ? body.venueId : null;
  const courtId = typeof body?.courtId === "string" && ID_PATTERN.test(body.courtId) ? body.courtId : null;
  const sport = parseSport(body?.sport);
  if (!body || !id || !venueId || !courtId || !sport) {
    return NextResponse.json(
      {
        error: `replayId, venueId, courtId e sport sao obrigatorios (e validos; sport: ${SPORTS.join(", ")})`,
      },
      { status: 400 },
    );
  }
  if (venueId !== edge.venueId) {
    return NextResponse.json({ error: "a chave nao pertence a este local" }, { status: 403 });
  }
  if (!(await getCourt(venueId, courtId))) {
    return NextResponse.json({ error: "quadra nao encontrada neste local" }, { status: 404 });
  }

  const videoPath = videoPathname(venueId, courtId, id);
  const video = await statObject(videoPath);
  if (!video) {
    return NextResponse.json({ error: "video nao encontrado no storage" }, { status: 422 });
  }

  // Sprite e opcional (SPRITE_FRAMES=0 ou falha ao gerar no edge).
  let spritePath: string | null = null;
  let spriteFrames: number | null = null;
  let spriteColumns: number | null = null;
  if (body.sprite) {
    const sprite = body.sprite as Record<string, unknown>;
    spriteFrames = positiveInt(sprite.frames);
    spriteColumns = positiveInt(sprite.columns);
    const path = spritePathname(venueId, courtId, id);
    if (spriteFrames && spriteColumns && (await statObject(path))) spritePath = path;
    else spriteFrames = spriteColumns = null;
  }

  const createdAt = new Date();
  const [row] = await db
    .insert(replay)
    .values({
      id,
      venueId,
      courtId,
      sport,
      videoPath,
      spritePath,
      spriteFrames,
      spriteColumns,
      durationSeconds: positiveInt(body.durationSeconds),
      sizeBytes: video.size,
      createdAt,
      expiresAt: expiryFrom(createdAt),
    })
    .onConflictDoNothing() // retry do edge apos resposta perdida: idempotente
    .returning({ id: replay.id });

  return NextResponse.json({ ok: true, id, created: Boolean(row) }, { status: row ? 201 : 200 });
}
