"use client";

import { useState } from "react";

const CARDS = [
  { q: "Tenho de instalar uma aplicação?", a: "Não. Abres o QR Code do campo no telemóvel e a lista de replays está lá.", tone: "bg-brand text-bg" },
  { q: "Quem pode carregar no botão?", a: "Qualquer jogador do grupo, a qualquer momento. Carregou, o lance fica guardado: 1 minuto e 30 segundos ou 1 minuto, conforme o desporto, com o pós-lance incluído.", tone: "bg-mint text-bg" },
  { q: "Como é o replay que recebo?", a: "Um vídeo vertical, pronto para stories, Reels e TikTok, filmado pelas câmaras do campo, em boa qualidade. Podes ver, descarregar e partilhar.", tone: "bg-leaf text-fg" },
  { q: "Durante quanto tempo vejo os replays?", a: "A lista é por campo e fica disponível durante a partida e pouco tempo depois. Descarrega o que quiseres antes de desaparecer.", tone: "bg-brand text-bg" },
  { q: "Quem pode ver o meu lance?", a: "Quem abrir a página de replays do campo enquanto os vídeos estão disponíveis. O jogo nunca é gravado na íntegra e não tem som. Com o passar do tempo, os vídeos apagam-se sozinhos.", tone: "bg-mint text-bg" },
  { q: "Quanto custa ver o replay?", a: "Depende do clube. Em alguns, o replay está incluído no aluguer do campo. Noutros, vês a pré-visualização grátis e só pagas antes de descarregar.", tone: "bg-leaf text-fg" },
];

// Perguntas em cartões redondos, sem linhas: o fechado é um tom de superfície, o
// aberto ganha a cor do cartão. O círculo à direita é o mesmo da página toda.
export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col gap-3">
      {CARDS.map((card, i) => {
        const active = i === open;
        return (
          <div
            key={card.q}
            className={`rounded-[28px] transition-colors duration-300 ${active ? card.tone : "bg-surface text-fg hover:bg-border"}`}
          >
            <button
              type="button"
              aria-expanded={active}
              aria-controls={`faq-${i}`}
              onClick={() => setOpen(active ? -1 : i)}
              className="flex min-h-[72px] w-full items-center justify-between gap-3 px-5 py-4 text-left text-base font-bold lg:px-6 lg:text-lg"
            >
              {card.q}
              <span
                aria-hidden
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-2xl leading-none transition-transform duration-300 ${
                  active ? "rotate-45 bg-bg text-fg" : "bg-brand text-bg"
                }`}
              >
                +
              </span>
            </button>
            <div id={`faq-${i}`} hidden={!active} className="px-5 pb-6 lg:px-6">
              <p className="max-w-[56ch] text-base">{card.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
