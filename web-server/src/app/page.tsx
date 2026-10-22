export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="font-extrabold">
          press2<span className="text-brand">replay</span>
        </span>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-brand">
        Replay desportivo para clubes e campos
      </p>
      <h1 className="text-5xl font-extrabold leading-tight">
        Todo grande lance merece ser <span className="text-brand">eternizado.</span>
      </h1>
      <p className="text-lg text-muted">
        Basta carregar no botão. O lance é guardado e chega ao telemóvel em segundos.
      </p>
      <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm">
        <span className="text-brand">✓</span> Vídeos apagados em 48 h
      </span>
    </main>
    </>
  );
}
