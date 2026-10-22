"use client";

import { useState } from "react";

const BANDS = [
  { say: "O jogo nunca é gravado todo.", why: "Só fica o último minuto, e é apagado continuamente. Sem botão, não fica nada.", on: "bg-brand text-bg" },
  { say: "Não gravamos o som.", why: "Os vídeos são só imagem: nem conversas, nem gritos de golo.", on: "bg-mint text-bg" },
  { say: "Ninguém é reconhecido.", why: "Sem reconhecimento facial. Um lance é um lance, não uma ficha de pessoas.", on: "bg-leaf text-fg" },
  { say: "Os vídeos apagam-se sozinhos.", why: "Os replays ficam na lista do campo durante a partida e pouco tempo depois. Descarrega o que quiseres antes de desaparecerem.", on: "bg-brand text-bg" },
  { say: "Não instalas nenhuma aplicação.", why: "Abres o QR Code do campo e a lista de replays está lá.", on: "bg-mint text-bg" },
];

// Cada cartão inteiro é o interruptor (um só botão): clicar em qualquer ponto liga/desliga.
export function Switches() {
  const [on, setOn] = useState<boolean[]>([true, false, true, false, false]);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-3 lg:px-8">
      {BANDS.map((band, i) => {
        const active = on[i];
        return (
          <button
            key={band.say}
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setOn((s) => s.map((v, j) => (j === i ? !v : v)))}
            className={`group grid min-h-[132px] w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-4 rounded-[32px] px-6 py-5 text-left transition-[background-color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:scale-[0.99] lg:px-10 ${
              active ? band.on : "bg-surface text-muted hover:bg-border"
            }`}
          >
            <span className="block">
              <span className="block text-[clamp(24px,4vw,60px)] font-extrabold leading-tight tracking-tight lg:whitespace-nowrap">
                {band.say}
              </span>
              <span
                className={`block max-w-[56ch] overflow-hidden text-base transition-[max-height,opacity,margin] duration-300 ${
                  active ? "mt-2 max-h-24 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {band.why}
              </span>
            </span>
            <span
              aria-hidden
              data-ui
              className={`relative block h-[1.1em] w-[2em] rounded-full text-[clamp(22px,2.6vw,40px)] transition-colors duration-300 ${
                active ? "bg-bg" : "bg-border group-hover:bg-bg"
              }`}
            >
              <span
                className={`absolute left-[0.1em] top-[0.1em] block size-[0.9em] rounded-full transition-transform duration-300 ${
                  active ? "translate-x-[0.9em] bg-brand" : "translate-x-0 bg-fg"
                }`}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
