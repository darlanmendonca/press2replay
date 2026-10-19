"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { court, venue } from "@/db/schema";
import { generateEdgeKey, hashEdgeKey } from "@/lib/edge-auth";
import { parseSport } from "@/lib/sports";
import { ID_PATTERN } from "@/lib/storage";
import { requireAdmin } from "@/lib/session";

// Estado devolvido ao useActionState dos formularios.
export type FormState = { error?: string; saved?: boolean; edgeKey?: string };

const ID_ERROR = "Id inválido: use letras, números, - e _ (até 64 caracteres).";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// O driver pode lancar o erro do Postgres direto ou embrulhado pelo Drizzle (`cause`).
function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

// Toda action confere o admin ela mesma: o guard do layout nao protege chamadas
// diretas a uma Server Action (ver comentario em src/lib/session.ts).

export async function createVenueAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = field(formData, "id");
  const name = field(formData, "name");
  if (!ID_PATTERN.test(id)) return { error: ID_ERROR };
  if (!name || name.length > 120) return { error: "Indique o nome do place (até 120 caracteres)." };

  try {
    await db.insert(venue).values({ id, name });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Já existe um place com esse id." };
    throw err;
  }
  revalidatePath("/admin/places");
  redirect(`/admin/places/${id}`);
}

export async function updateVenueAction(
  venueId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const name = field(formData, "name");
  if (!name || name.length > 120) return { error: "Indique o nome do place (até 120 caracteres)." };

  const updated = await db.update(venue).set({ name }).where(eq(venue.id, venueId)).returning({ id: venue.id });
  if (updated.length === 0) return { error: "Place não encontrado." };
  revalidatePath("/admin/places");
  revalidatePath(`/admin/places/${venueId}`);
  return { saved: true };
}

export async function createCourtAction(
  venueId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = field(formData, "id");
  const name = field(formData, "name");
  const sport = parseSport(field(formData, "sport"));
  if (!ID_PATTERN.test(id)) return { error: ID_ERROR };
  if (!name || name.length > 120) return { error: "Indique o nome da quadra (até 120 caracteres)." };
  if (!sport) return { error: "Escolha o esporte padrão." };

  const [exists] = await db.select({ id: venue.id }).from(venue).where(eq(venue.id, venueId)).limit(1);
  if (!exists) return { error: "Place não encontrado." };

  try {
    await db.insert(court).values({ venueId, id, name, sport });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Este place já tem uma quadra com esse id." };
    throw err;
  }
  revalidatePath("/admin/places");
  revalidatePath(`/admin/places/${venueId}`);
  return { saved: true };
}

export async function updateCourtAction(
  venueId: string,
  courtId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const name = field(formData, "name");
  const sport = parseSport(field(formData, "sport"));
  if (!name || name.length > 120) return { error: "Indique o nome da quadra (até 120 caracteres)." };
  if (!sport) return { error: "Escolha o esporte padrão." };

  const updated = await db
    .update(court)
    .set({ name, sport })
    .where(and(eq(court.venueId, venueId), eq(court.id, courtId)))
    .returning({ id: court.id });
  if (updated.length === 0) return { error: "Quadra não encontrada." };
  revalidatePath(`/admin/places/${venueId}`);
  return { saved: true };
}

// Gera (ou rotaciona) a chave do edge do place. A chave anterior para de
// funcionar na hora. O valor em claro so existe nesta resposta: no banco fica
// apenas o hash.
export async function rotateEdgeKeyAction(venueId: string): Promise<FormState> {
  await requireAdmin();
  const edgeKey = generateEdgeKey();
  const updated = await db
    .update(venue)
    .set({ edgeKeyHash: hashEdgeKey(edgeKey), edgeKeyCreatedAt: new Date() })
    .where(eq(venue.id, venueId))
    .returning({ id: venue.id });
  if (updated.length === 0) return { error: "Place não encontrado." };
  revalidatePath("/admin/places");
  revalidatePath(`/admin/places/${venueId}`);
  return { edgeKey };
}
