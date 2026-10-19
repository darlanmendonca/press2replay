import { NextResponse, type NextRequest } from "next/server";
import { getActiveReplay } from "@/lib/replays";
import { openObject } from "@/lib/storage";

// O video e transmitido por esta funcao do inicio ao fim do download; no Hobby
// (Fluid compute) 300s e o maximo. Um clipe de ~35MB so estoura abaixo de ~1 Mbit/s.
export const maxDuration = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Entrega publica (o jogador chega pelo QR, sem login) dos arquivos de um
// replay. O storage e privado: o unico caminho ate o arquivo e esta rota, que
// checa a expiracao a cada request - o link do replay morre no `expiresAt`
// mesmo que o cron diario ainda nao tenha apagado o objeto.
//   /api/replays/{id}/video  -> mp4 como download (attachment)
//   /api/replays/{id}/sprite -> spritesheet jpg (preview)
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/replays/[id]/[asset]">) {
  const { id, asset } = await ctx.params;
  if (!UUID.test(id) || (asset !== "video" && asset !== "sprite")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const row = await getActiveReplay(id);
  const pathname = asset === "video" ? row?.videoPath : row?.spritePath;
  if (!row || !pathname) return new NextResponse("Not found", { status: 404 });

  const object = await openObject(pathname);
  if (!object) return new NextResponse("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": object.contentType,
    "Content-Length": String(object.size),
    "X-Content-Type-Options": "nosniff",
  };
  if (asset === "video") {
    headers["Content-Disposition"] = `attachment; filename="replay-${row.venueId}-${row.courtId}-${id.slice(0, 8)}.mp4"`;
    headers["Cache-Control"] = "private, no-store";
  } else {
    // O sprite nunca muda e a pagina o repete a cada visita: cache no browser
    // (so privado, nunca no CDN) ate a expiracao.
    const maxAge = Math.max(0, Math.floor((row.expiresAt.getTime() - Date.now()) / 1000));
    headers["Cache-Control"] = `private, max-age=${Math.min(maxAge, 3600)}`;
  }
  return new NextResponse(object.stream, { headers });
}
