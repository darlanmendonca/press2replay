import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { venue } from "@/db/schema";

// Cada LOCAL tem uma chave de edge (o edge e um so por local e sobe replays de
// qualquer quadra dele). So o sha256 fica no banco; a chave em claro aparece
// uma vez, quando o admin a gera. Alta entropia (256 bits), entao um hash
// simples sem sal serve e a busca por hash e direta.
const KEY_PREFIX = "p2r_";

export function generateEdgeKey() {
  return KEY_PREFIX + randomBytes(32).toString("base64url");
}

export function hashEdgeKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

// Autenticacao do edge: `Authorization: Bearer <chave do local>`. Devolve o
// local dono da chave, ou null. O local vem SEMPRE da chave, nunca do corpo.
export async function authenticateEdge(request: Request): Promise<{ venueId: string } | null> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!key.startsWith(KEY_PREFIX)) return null;

  const [row] = await db
    .select({ id: venue.id })
    .from(venue)
    .where(eq(venue.edgeKeyHash, hashEdgeKey(key)))
    .limit(1);
  return row ? { venueId: row.id } : null;
}
