"use client";

import Image from "next/image";
import { useState } from "react";

type Stage = {
  name: string;
  text: string;
  tone: string; // fundo do painel
  ink: string; // cor do texto
  photo: { src: string; alt: string; w: number; h: number; pos: string };
};

const STAGES: Stage[] = [
  {
    name: "No campo",
    text: "Cada campo tem a sua página de replays, que abres pelo QR Code junto ao botão. Os replays do teu jogo vão aparecer lá.",
    tone: "bg-forest",
    ink: "text-fg",
    photo: { src: "/photos/botao-padel.jpg", alt: "Botão vermelho do press2replay numa placa junto a um campo de padel, com um jogador ao fundo", w: 1254, h: 1254, pos: "50% 50%" },
  },
  {
    name: "Jogas",
    text: "As câmaras acompanham o campo, mas o jogo nunca é gravado na íntegra: só ficam os últimos instantes, apagados continuamente. Tu só jogas.",
    tone: "bg-leaf",
    ink: "text-fg",
    photo: { src: "/photos/padel-jogo.jpg", alt: "Quatro jogadores de padel num campo ao sol, com o jogador de amarelo a devolver a bola", w: 1254, h: 1254, pos: "50% 50%" },
  },
  {
    name: "Carregas",
    text: "Boa jogada? Um jogador carrega no botão ao lado do campo e só esse momento é guardado: 1 minuto e 30 segundos ou 1 minuto, conforme o desporto.",
    tone: "bg-brand",
    ink: "text-bg",
    photo: { src: "/photos/carregar-botao.jpg", alt: "Jogador a carregar com a mão no botão vermelho do press2replay, numa placa junto ao campo de padel", w: 1254, h: 1254, pos: "50% 50%" },
  },
  {
    name: "Vês e partilhas",
    text: "Durante a partida ou depois, abres a página do campo no telemóvel pelo QR Code. Vês a lista de replays, descarregas e partilhas. Sem aplicação para instalar. Fácil e rápido.",
    tone: "bg-mint",
    ink: "text-bg",
    photo: { src: "/photos/replays-telemovel.jpg", alt: "Jogador a segurar um telemóvel com a lista de replays do press2replay, num campo de padel", w: 1254, h: 1254, pos: "50% 50%" },
  },
];

// Em todas as etapas a mesma composição: a foto, em círculo grande, com círculos translúcidos
// cada vez maiores atrás, e os dois a sair pelo canto do cartão (que corta o que passa).
export function Journey() {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col gap-3 lg:h-[520px] lg:flex-row">
      {STAGES.map((stage, i) => {
        const active = i === open;
        return (
          <div
            key={stage.name}
            className={`${stage.tone} ${stage.ink} relative overflow-hidden rounded-[32px] transition-[flex-grow] duration-[450ms] ease-out lg:min-w-0 ${
              active ? "lg:flex-[7_1_0%]" : "lg:flex-[1_1_0%]"
            }`}
          >
            <button
              type="button"
              aria-expanded={active}
              aria-controls={`stage-${i}`}
              onClick={() => setOpen(i)}
              className="flex h-16 w-full items-center px-6 text-left text-lg font-bold lg:absolute lg:inset-0 lg:z-20 lg:h-auto lg:items-end lg:px-0 lg:pb-6 lg:pl-5"
            >
              <span
                className={`lg:[writing-mode:vertical-rl] lg:rotate-180 lg:whitespace-nowrap lg:text-lg ${
                  active ? "lg:opacity-0" : ""
                } transition-opacity duration-300`}
              >
                {stage.name}
              </span>
            </button>

            <div
              id={`stage-${i}`}
              hidden={!active}
              className={`relative h-[440px] lg:absolute lg:inset-0 lg:h-auto ${active ? "" : "lg:hidden"}`}
            >
              {/* o desenho: círculos + foto, cortados pelo canto do cartão */}
              <div className="absolute inset-0 overflow-hidden">
                {/* círculos translúcidos: partilham a margem esquerda da foto e crescem para a direita */}
                <span
                  aria-hidden
                  className="absolute max-lg:bottom-0 max-lg:left-1/2 max-lg:w-[155%] max-lg:aspect-square max-lg:-translate-x-1/2 max-lg:translate-y-[53%] rounded-full bg-current opacity-[0.07] lg:left-auto lg:right-[-140px] lg:top-[40px] lg:size-[600px]"
                />
                <span
                  aria-hidden
                  className="absolute max-lg:bottom-0 max-lg:left-1/2 max-lg:w-[135%] max-lg:aspect-square max-lg:-translate-x-1/2 max-lg:translate-y-[51%] rounded-full bg-current opacity-[0.12] lg:left-auto lg:right-[-100px] lg:top-[60px] lg:size-[560px]"
                />
                <div className="absolute max-lg:bottom-0 max-lg:left-1/2 max-lg:w-[120%] max-lg:aspect-square max-lg:-translate-x-1/2 max-lg:translate-y-[50%] overflow-hidden rounded-full lg:left-auto lg:right-[-60px] lg:top-[80px] lg:size-[520px] lg:translate-x-0">
                  <Image
                    src={stage.photo.src}
                    alt={stage.photo.alt}
                    width={stage.photo.w}
                    height={stage.photo.h}
                    sizes="(min-width: 1024px) 520px, 100vw"
                    style={{ objectPosition: stage.photo.pos }}
                    className="size-full object-cover"
                  />
                </div>
              </div>

              <div className="relative z-10 flex flex-col gap-6 px-6 pt-2 lg:absolute lg:inset-y-0 lg:left-0 lg:w-[46%] lg:justify-between lg:p-8 lg:pb-8">
                <h3 className="max-lg:hidden text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">{stage.name}</h3>
                <p className="max-w-[36ch] text-lg">{stage.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
