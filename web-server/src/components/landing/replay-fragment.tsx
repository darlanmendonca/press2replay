import Image from "next/image";

// O ecrã de replay que o jogador abre no telemóvel, como fragmento da interface
// do produto. A imagem do vídeo é ilustrativa (trocar por um frame de replay real).
export function ReplayFragment({ compact = false }: { compact?: boolean }) {
  return (
    <div
      data-ui
      className={`w-full max-w-[340px] rounded-[28px] p-4 text-fg ${compact ? "bg-surface" : "bg-bg"}`}
      role="img"
      aria-label="Ecrã de replay no telemóvel: vídeo de um lance de futsal e botões para descarregar e partilhar"
    >
      <p className="text-base font-extrabold">
        press2<span className="text-brand">replay</span>
      </p>
      <p className="mt-3 text-sm text-muted">Futsal · Campo 2 · há 1 min</p>


      <div className="relative mt-3 aspect-square overflow-hidden rounded-2xl bg-surface">
        <Image
          src="/photos/futsal-ai.jpg"
          alt=""
          width={1254}
          height={1254}
          sizes="290px"
          className="size-full object-cover"
        />
        <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-bg">
          <svg viewBox="0 0 100 100" className="size-7" aria-hidden>
            <path d="M34 20 L82 50 L34 80 Z" fill="currentColor" />
          </svg>
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-bg px-3 py-1 text-sm font-bold">1:00</span>
      </div>

      <div className={`mt-4 grid gap-2 font-bold ${compact ? "grid-cols-[1.5fr_1fr] text-sm" : "grid-cols-2 text-base"}`}>
        <span className="flex h-12 items-center justify-center rounded-lg bg-brand text-bg">Descarregar</span>
        <span className={`flex h-12 items-center justify-center rounded-lg text-fg ${compact ? "bg-bg" : "bg-surface"}`}>Partilhar</span>
      </div>
    </div>
  );
}
