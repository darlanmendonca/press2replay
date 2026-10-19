import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";
import { listVenues } from "@/lib/venues";
import { cardClass } from "../styles";
import { NewVenueForm } from "./new-venue-form";

export default function VenuesPage() {
  return (
    <main className="py-10">
      <h1 className="text-3xl font-extrabold">Places</h1>
      <p className="mt-2 text-muted">
        Cada place tem as suas quadras, uma chave de edge e os replays que o edge envia.
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">A carregar…</p>}>
        <VenuesContent />
      </Suspense>
    </main>
  );
}

async function VenuesContent() {
  await requireAdmin(); // cada pagina confere o admin sozinha (ver src/lib/session.ts)
  const venues = await listVenues();

  return (
    <>
      {venues.length === 0 ? (
        <p className={`${cardClass} mt-8 text-center text-muted`}>
          Ainda não há places. Crie o primeiro abaixo.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {venues.map((v) => (
            <li key={v.id}>
              <Link
                href={`/admin/places/${v.id}`}
                className={`${cardClass} block transition-colors hover:border-brand`}
              >
                <p className="text-lg font-bold">{v.name}</p>
                <p className="mt-1 font-mono text-xs text-muted">{v.id}</p>
                <p className="mt-3 text-sm text-muted">
                  {v.courts} {v.courts === 1 ? "quadra" : "quadras"} ·{" "}
                  {v.hasEdgeKey ? (
                    <span className="text-brand">chave do edge ativa</span>
                  ) : (
                    "sem chave do edge"
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className={`${cardClass} mt-10`}>
        <h2 className="mb-4 text-xl font-extrabold">Novo place</h2>
        <NewVenueForm />
      </section>
    </>
  );
}
