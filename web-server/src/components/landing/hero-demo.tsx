"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { DiscStack } from "./disc-stack";
import { ReplayFragment } from "./replay-fragment";

const STEPS = [
  { name: "Jogas", text: "Estás em campo. As câmaras estão a ver, mas o jogo não é gravado." },
  { name: "Carregas", text: "Boa jogada? Alguém carrega no botão ao lado do campo para guardar o lance." },
  { name: "Recebes o replay", text: "Em segundos, o replay da jogada (cerca de 30 s) chega ao teu telemóvel. Vês, descarregas, partilhas." },
];

const BARS = 30;

// A história inteira em cinco segundos: o lance, o botão, o vídeo no telemóvel.
// Avança sozinha e também se pode carregar nos passos (ou no próprio botão).
export function HeroDemo() {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3400);
    return () => clearInterval(id);
  }, [auto]);

  function pick(i: number) {
    setAuto(false);
    setStep(i);
  }

  function pressButton() {
    track("landing_button_pressed");
    pick(2);
  }

  const pressed = step >= 1;
  const received = step === 2;

  return (
    <div className="flex flex-col gap-8">
      <div className="relative mx-auto aspect-square w-full max-w-[500px]">
        {/* a foto, com discos verdes atrás, cada um deslocado do anterior */}
        <DiscStack
          className={`absolute inset-0 origin-left transition-transform duration-500 ease-out ${received ? "scale-[0.84]" : ""}`}
          tones={["bg-brand", "bg-leaf", "bg-forest"]}
          dir={received ? [1, 0.4] : [-1, 0.4]}
        >
        <div className="absolute inset-0 overflow-hidden rounded-full bg-surface">
          <Image
            src="/photos/futsal-indoor.jpg"
            alt="Jogadora de futsal a conduzir a bola num pavilhão"
            width={1920}
            height={2400}
            sizes="(min-width: 1024px) 40vw, 90vw"
            priority
            style={{ objectPosition: "50% 38%" }}
            className="size-full object-cover"
          />
        </div>
        </DiscStack>

        {/* o botão do campo */}
        <button
          type="button"
          onClick={pressButton}
          aria-label="Carregar no botão de replay"
          className="group absolute bottom-[4%] left-[0%] size-[26%] rounded-full"
        >
          {pressed && (
            <span
              key={step}
              aria-hidden
              className={`absolute inset-0 rounded-full bg-fg ${step === 1 ? "animate-[ping-ring_1.2s_ease-out_infinite]" : "opacity-0"}`}
            />
          )}
          <span
            className={`relative flex size-full items-center justify-center rounded-full bg-brand text-bg transition-transform duration-200 group-hover:scale-105 ${
              pressed ? "scale-90" : ""
            }`}
          >
            <svg viewBox="0 0 100 100" className="size-[44%]" aria-hidden>
              <path d="M34 20 L82 50 L34 80 Z" fill="currentColor" />
            </svg>
          </span>
        </button>

        {/* os 30 segundos guardados */}
        <div
          aria-hidden
          className="absolute bottom-[1%] left-[30%] flex h-[7%] w-[30%] items-end gap-[2px] max-sm:hidden"
        >
          {Array.from({ length: BARS }, (_, i) => (
            <span
              key={i}
              style={{ transitionDelay: pressed ? `${i * 18}ms` : "0ms" }}
              className={`flex-1 rounded-full transition-[height,background-color] duration-300 ${
                pressed ? "h-full bg-fg" : "h-1/3 bg-fg/30"
              }`}
            />
          ))}
        </div>

        {/* o replay chega ao telemóvel */}
        <div
          className={`absolute right-0 top-[12%] w-[48%] min-w-[190px] max-sm:top-0 max-sm:w-[70%] max-sm:min-w-[240px] transition-[transform,opacity] duration-500 ease-out ${
            received ? "translate-x-0 opacity-100" : "translate-x-[18%] opacity-0"
          }`}
          aria-hidden={!received}
        >
          <ReplayFragment compact />
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3" aria-label="Como funciona, em três momentos">
        {STEPS.map((s, i) => {
          const active = i === step;
          return (
            <li key={s.name}>
              <button
                type="button"
                onClick={() => pick(i)}
                aria-current={active ? "step" : undefined}
                className={`flex h-full w-full flex-col gap-2 rounded-[28px] p-5 text-left ${
                  active ? "bg-brand text-bg" : "bg-surface text-fg hover:bg-border"
                }`}
              >
                <span className="text-lg font-extrabold">{s.name}</span>
                <span className="text-base">{s.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
