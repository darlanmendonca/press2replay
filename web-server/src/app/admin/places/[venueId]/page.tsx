import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { MomentCard } from "@/components/moment-card";
import { groupMoments, momentCardProps } from "@/lib/moments";
import { REPLAY_TTL_MINUTES } from "@/lib/replays";
import { requireAdmin } from "@/lib/session";
import { ID_PATTERN } from "@/lib/storage";
import { getVenue, listCourts, listVenueReplays } from "@/lib/venues";
import { cardClass } from "../../styles";
import { CourtRow, EdgeKeyPanel, EditVenueForm, NewCourtForm } from "./forms";

export default function VenuePage({ params }: PageProps<"/admin/places/[venueId]">) {
  return (
    <main className="py-10">
      <Link href="/admin/places" className="text-sm text-muted transition-colors hover:text-brand">
        ← Places
      </Link>
      <Suspense fallback={<p className="mt-8 text-muted">A carregar…</p>}>
        <VenueContent params={params} />
      </Suspense>
    </main>
  );
}

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

async function VenueContent({ params }: Pick<PageProps<"/admin/places/[venueId]">, "params">) {
  await requireAdmin(); // cada pagina confere o admin sozinha (ver src/lib/session.ts)
  const { venueId } = await params;
  if (!ID_PATTERN.test(venueId)) notFound();
  const venue = await getVenue(venueId);
  if (!venue) notFound();

  await connection(); // a lista de replays depende da hora atual (janela de expiracao)
  const [courts, replays] = await Promise.all([listCourts(venueId), listVenueReplays(venueId)]);

  // Momentos (um aperto do botao, com um replay por camera) por quadra, na ordem
  // das quadras.
  const byCourt = courts
    .map((c) => ({ court: c, items: groupMoments(replays.filter((r) => r.courtId === c.id)) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <h1 className="mt-4 text-3xl font-extrabold">{venue.name}</h1>
      <p className="mt-1 font-mono text-sm text-muted">{venue.id}</p>

      <section className={`${cardClass} mt-8`}>
        <h2 className="mb-4 text-xl font-extrabold">Place</h2>
        <EditVenueForm venueId={venue.id} name={venue.name} />
        <p className="mt-3 text-xs text-muted">
          O id do place não pode ser alterado: está nos QRs impressos das quadras.
        </p>
      </section>

      <section className={`${cardClass} mt-6`}>
        <h2 className="mb-4 text-xl font-extrabold">Chave do edge</h2>
        <EdgeKeyPanel
          venueId={venue.id}
          hasKey={Boolean(venue.edgeKeyHash)}
          createdAt={venue.edgeKeyCreatedAt ? dateFormat.format(venue.edgeKeyCreatedAt) : null}
        />
      </section>

      <section className={`${cardClass} mt-6`}>
        <h2 className="mb-1 text-xl font-extrabold">Quadras</h2>
        <p className="mb-4 text-sm text-muted">
          O QR de cada quadra aponta para o endereço mostrado. O id da quadra só precisa de ser
          único neste place e também não pode ser alterado.
        </p>
        {courts.length === 0 ? (
          <p className="mb-4 text-sm text-muted">Este place ainda não tem quadras.</p>
        ) : (
          <ul className="mb-6 flex flex-col gap-3">
            {courts.map((c) => (
              <CourtRow
                key={c.id}
                venueId={venue.id}
                courtId={c.id}
                name={c.name}
                sport={c.sport}
              />
            ))}
          </ul>
        )}
        <NewCourtForm venueId={venue.id} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-extrabold">Replays</h2>
        <p className="mb-6 mt-1 text-sm text-muted">
          Os replays deste place ainda disponíveis (últimas {REPLAY_TTL_MINUTES / 60} horas).
        </p>
        {byCourt.length === 0 ? (
          <p className={`${cardClass} text-center text-muted`}>
            Nenhum replay disponível neste momento.
          </p>
        ) : (
          byCourt.map(({ court, items }) => (
            <div key={court.id} className="mb-8">
              <h3 className="mb-3 font-bold">
                {court.name}{" "}
                <span className="font-normal text-muted">
                  · {items.length} {items.length === 1 ? "replay" : "replays"}
                </span>
              </h3>
              <ul className="grid gap-6 sm:grid-cols-2">
                {items.map((moment) => (
                  <li key={moment.id}>
                    <MomentCard {...momentCardProps(moment)} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </>
  );
}
