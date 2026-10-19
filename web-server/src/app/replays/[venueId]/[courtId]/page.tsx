import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MomentCard } from "@/components/moment-card";
import { groupMoments, momentCardProps } from "@/lib/moments";
import { listRecentReplays, REPLAY_TTL_MINUTES } from "@/lib/replays";
import { ID_PATTERN } from "@/lib/storage";
import { getCourt } from "@/lib/venues";

// /replays/{venueId}/{courtId}: destino do QR fixo do botao da quadra. Publica
// (o jogador chega pelo telemovel, sem login) e so le replays desta quadra,
// dentro do TTL.
export default function CourtPage({ params }: PageProps<"/replays/[venueId]/[courtId]">) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <p className="text-sm font-extrabold">
        press2<span className="text-brand">replay</span>
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">A carregar…</p>}>
        <CourtReplays params={params} />
      </Suspense>
    </main>
  );
}

async function CourtReplays({
  params,
}: Pick<PageProps<"/replays/[venueId]/[courtId]">, "params">) {
  const { venueId, courtId } = await params;
  if (!ID_PATTERN.test(venueId) || !ID_PATTERN.test(courtId)) notFound();

  // Local/quadra desconhecidos (ou digitados errado no QR): 404.
  const court = await getCourt(venueId, courtId);
  if (!court) notFound();

  await connection(); // depende da hora atual (janela de expiracao): sempre dinamico
  const replays = await listRecentReplays(venueId, courtId);

  return (
    <>
      <h1 className="mt-6 text-3xl font-extrabold">Replays</h1>
      <ul className="mt-3 flex flex-wrap gap-2">
        {[court.sport, court.name].map((label, i) => (
          <li
            key={i}
            className="rounded-full border border-brand px-3 py-1 text-xs font-bold text-brand"
          >
            {label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">
        Os replays ficam disponíveis durante {REPLAY_TTL_MINUTES / 60} horas.
      </p>

      {replays.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-border bg-surface p-6 text-center text-muted">
          Ainda não há replays nas últimas {REPLAY_TTL_MINUTES / 60} horas. Carregue no botão
          da quadra depois de um grande lance!
        </p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {groupMoments(replays).map((moment) => (
            <li key={moment.id}>
              <MomentCard {...momentCardProps(moment)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
