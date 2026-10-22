import { desc } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { contactRequest } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { cardClass } from "../styles";
import { HandledButton } from "./handled-button";

export default function ContactsPage() {
  return (
    <main className="py-10">
      <h1 className="text-3xl font-extrabold">Contactos</h1>
      <p className="mt-2 text-muted">Pedidos enviados pelo formulário da página inicial.</p>
      <Suspense fallback={<p className="mt-8 text-muted">A carregar…</p>}>
        <ContactsContent />
      </Suspense>
    </main>
  );
}

async function ContactsContent() {
  await requireAdmin(); // cada pagina confere o admin sozinha (ver src/lib/session.ts)
  const rows = await db.select().from(contactRequest).orderBy(desc(contactRequest.createdAt)).limit(200);

  if (rows.length === 0) {
    return <p className={`${cardClass} mt-8 text-center text-muted`}>Ainda não há pedidos.</p>;
  }

  const fmt = new Intl.DateTimeFormat("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" });

  return (
    <ul className="mt-8 flex flex-col gap-4">
      {rows.map((r) => (
        <li key={r.id} className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{r.club}</p>
              <p className="mt-1 text-sm text-muted">
                {r.name} ·{" "}
                <a href={`mailto:${encodeURIComponent(r.email)}`} className="text-brand hover:underline">
                  {r.email}
                </a>{" "}
                · {fmt.format(r.createdAt)}
              </p>
            </div>
            <HandledButton id={r.id} handled={r.handledAt !== null} />
          </div>
          {r.message && <p className="mt-3 whitespace-pre-wrap">{r.message}</p>}
        </li>
      ))}
    </ul>
  );
}
