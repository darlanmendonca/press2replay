import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { authenticateEdge } from "@/lib/edge-auth";
import { UPLOAD_PATHNAME_PATTERN } from "@/lib/storage";
import { getCourt } from "@/lib/venues";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_SPRITE_BYTES = 5 * 1024 * 1024;

// Emite tokens de upload direto pro Blob (o video nao passa pela funcao: o
// limite de body na Vercel e ~4.5MB). O edge chama isto via `upload()` do
// @vercel/blob/client com `Authorization: Bearer <chave do local>`. O mesmo
// endpoint recebe o callback "upload concluido" do Blob (sem o nosso header,
// verificado pela assinatura dentro do handleUpload) - por isso o auth fica
// em onBeforeGenerateToken, e nao no inicio da rota.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const edge = await authenticateEdge(request);
        if (!edge) throw new Error("unauthorized");

        const match = UPLOAD_PATHNAME_PATTERN.exec(pathname);
        if (!match) throw new Error("pathname invalido");
        const [, venueId, courtId, , , extension] = match;
        // A chave so vale pro proprio local e so pra quadras que existem nele
        // (o cameraId so tem o formato conferido: nao ha tabela de cameras).
        if (venueId !== edge.venueId) throw new Error("forbidden");
        if (!(await getCourt(venueId, courtId))) throw new Error("quadra nao encontrada");
        const isVideo = extension === "mp4";

        return {
          allowedContentTypes: [isVideo ? "video/mp4" : "image/jpeg"],
          maximumSizeInBytes: isVideo ? MAX_VIDEO_BYTES : MAX_SPRITE_BYTES,
          addRandomSuffix: false, // o caminho e derivado do replayId
          allowOverwrite: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message },
      { status: message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 400 },
    );
  }
}
