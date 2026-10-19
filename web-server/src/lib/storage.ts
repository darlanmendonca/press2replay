import "server-only";
import { BlobNotFoundError, del, get, head, list } from "@vercel/blob";

// Camada fina sobre o Vercel Blob (store PRIVADO): o resto do app nao importa
// @vercel/blob, so isto. Se um dia o storage trocar (R2/S3), muda so aqui.
// Autenticacao: BLOB_READ_WRITE_TOKEN (dev/local) ou OIDC (na Vercel, com o
// store conectado ao projeto) - o SDK escolhe sozinho.

export const REPLAYS_PREFIX = "replays/";

// venueId, courtId e cameraId vem do edge (autenticado) e da URL publica, e
// viram parte do caminho no storage: so letras, numeros, - e _.
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const REPLAY_ID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const UPLOAD_PATHNAME_PATTERN = new RegExp(
  `^${REPLAYS_PREFIX}([A-Za-z0-9_-]{1,64})/([A-Za-z0-9_-]{1,64})/([A-Za-z0-9_-]{1,64})/(${REPLAY_ID_PATTERN})\\.(mp4|jpg)$`,
);

// Replays registrados antes das cameras ficam em replays/{lugar}/{quadra}/{id}
// (o caminho antigo esta guardado na linha): so os novos usam o segmento da camera.
export function videoPathname(venueId: string, courtId: string, cameraId: string, replayId: string) {
  return `${REPLAYS_PREFIX}${venueId}/${courtId}/${cameraId}/${replayId}.mp4`;
}

export function spritePathname(venueId: string, courtId: string, cameraId: string, replayId: string) {
  return `${REPLAYS_PREFIX}${venueId}/${courtId}/${cameraId}/${replayId}.jpg`;
}

// Metadados do objeto, ou null se ele nao existe.
export async function statObject(pathname: string) {
  try {
    const { size, contentType } = await head(pathname);
    return { size, contentType };
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

// Stream do objeto (sem bufferizar), ou null se nao existe.
export async function openObject(pathname: string) {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return {
    stream: result.stream,
    contentType: result.blob.contentType,
    size: result.blob.size,
  };
}

export async function removeObjects(pathnames: string[]) {
  if (pathnames.length > 0) await del(pathnames);
}

// Objetos em replays/ enviados antes de `cutoff`: sobra de upload que nunca
// foi registrado (edge caiu entre o upload e o registro) ou de delete que falhou.
export async function listObjectsUploadedBefore(cutoff: Date, max = 500) {
  const found: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: REPLAYS_PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (blob.uploadedAt < cutoff) found.push(blob.pathname);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor && found.length < max);
  return found.slice(0, max);
}
