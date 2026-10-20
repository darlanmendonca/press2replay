"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { track } from "@vercel/analytics";

const PLAY_INTERVAL_MS = 450;

type Sprite = { frames: number; columns: number };

const noopSubscribe = () => () => {};

// Card de um replay: preview por spritesheet (um unico jpg com N frames numa
// grelha) e botao de download. O preview e so manual (nada anima sozinho, pra
// lista nao ficar poluida): parado mostra o primeiro frame e, ao passar o rato
// ou arrastar o dedo por cima, percorre os frames conforme a posicao
// horizontal; o botao de play percorre-os sozinho ate o utilizador pausar.
export function ReplayCard({
  id,
  createdAt,
  durationSeconds,
  sprite,
}: {
  id: string;
  createdAt: string;
  durationSeconds: number | null;
  sprite: Sprite | null;
}) {
  // Hora no fuso do visitante: vazia no servidor (que nao o conhece), preenchida
  // no cliente sem divergir na hidratacao.
  const time = useSyncExternalStore(
    noopSubscribe,
    () => new Date(createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
    () => "",
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface">
      {sprite ? (
        <SpritePreview id={id} sprite={sprite} />
      ) : (
        <div className="flex aspect-video items-center justify-center bg-bg text-sm text-muted">
          Sem pré-visualização
        </div>
      )}
      <div className="flex items-center justify-between gap-4 p-4">
        <div className="text-sm">
          <p className="font-bold">{time || " "}</p>
          {durationSeconds ? <p className="text-muted">{durationSeconds}s</p> : null}
        </div>
        <a
          href={`/api/replays/${id}/video`}
          download
          onClick={() => track("replay_download", { replayId: id })}
          className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-bg transition-opacity hover:opacity-90"
        >
          Baixar
        </a>
      </div>
    </article>
  );
}

function SpritePreview({ id, sprite }: { id: string; sprite: Sprite }) {
  const { frames, columns } = sprite;
  const rows = Math.ceil(frames / columns);
  const src = `/api/replays/${id}/sprite`;

  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Proporcao de um frame, lida do jpg depois de carregar (o servidor nao a guarda).
  const [aspect, setAspect] = useState(16 / 9);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspect(img.naturalWidth / columns / (img.naturalHeight / rows));
      }
    };
    img.src = src;
  }, [src, columns, rows]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames), PLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, frames]);

  const col = frame % columns;
  const row = Math.floor(frame / columns);

  // Um evento por replay e por visita: mexer no preview varias vezes nao inflaciona a contagem.
  const tracked = useRef(false);
  function trackPreview(action: "scrub" | "play") {
    if (tracked.current) return;
    tracked.current = true;
    track("replay_preview", { replayId: id, action });
  }

  function scrub(event: React.PointerEvent<HTMLDivElement>) {
    if (playing) return; // enquanto toca, o arrastar nao disputa o frame com o play
    trackPreview("scrub");
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 0.999);
    setFrame(Math.floor(ratio * frames));
  }

  return (
    <div className="relative touch-pan-y" onPointerMove={scrub}>
      <div
        role="img"
        aria-label="Pré-visualização do replay"
        className="w-full bg-bg"
        style={{
          aspectRatio: aspect,
          backgroundImage: `url(${src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
          backgroundPosition: `${columns > 1 ? (col / (columns - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`,
        }}
      />
      <button
        type="button"
        onClick={() => {
          trackPreview("play");
          setPlaying((p) => !p);
        }}
        aria-label={playing ? "Pausar pré-visualização" : "Reproduzir pré-visualização"}
        aria-pressed={playing}
        className="absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-brand text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-4 translate-x-px" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-border/60">
        <div className="h-full bg-brand" style={{ width: `${((frame + 1) / frames) * 100}%` }} />
      </div>
    </div>
  );
}
