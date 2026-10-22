"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactRequest } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

// Marca um pedido como respondido (ou volta a "novo"). Cada action confere o admin
// ela mesma: o guard do layout nao protege chamadas diretas (ver src/lib/session.ts).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function toggleHandledAction(id: string, handled: boolean) {
  await requireAdmin();
  if (typeof id !== "string" || !UUID.test(id)) return; // vem do cliente: um id invalido nao chega ao Postgres
  await db
    .update(contactRequest)
    .set({ handledAt: Boolean(handled) ? new Date() : null })
    .where(eq(contactRequest.id, id));
  revalidatePath("/admin/contactos");
}
