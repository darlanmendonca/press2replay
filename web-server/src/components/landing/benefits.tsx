"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

type Benefit = { title: string; text: string; tone: string; span: string; big?: boolean };

type Tab = {
  id: "campo" | "jogador";
  chip: string;
  statement: string;
  intro: string;
  benefits: Benefit[];
};

// As duas abas: o dono do campo (texto do deck/referencia) e o jogador (sugestoes a validar).
const TABS: Tab[] = [
  {
    id: "jogador",
    chip: "Sou jogador",
    statement: "O teu melhor lance, sempre à mão.",
    intro:
      "Carregas no botão e o replay fica no telemóvel em segundos. Sem procurar o lance em horas de vídeo, sem instalar nada, pronto a partilhar com quem esteve em campo.",
    benefits: [
      { title: "Só o teu lance", text: "Ninguém tem de gravar nem cortar. Escolhes o momento, carregas no botão e é só esse que fica guardado.", tone: "bg-surface text-fg", span: "lg:col-span-2" },
      { title: "Em segundos, ainda no campo", text: "O replay está pronto antes de saíres da quadra. Mostras ao grupo e festejas enquanto o ponto ainda está quente.", tone: "bg-brand text-bg", span: "lg:col-span-4", big: true },
      { title: "Sem instalar nada", text: "Abres o QR Code junto ao botão e a lista de replays aparece no telemóvel. Sem aplicação e sem esperas.", tone: "bg-mint text-bg", span: "lg:col-span-3" },
      { title: "Pronto para as redes", text: "Vídeo vertical, feito para stories e Reels. Descarregas e partilhas com dois toques.", tone: "bg-surface text-fg", span: "lg:col-span-3" },
      { title: "Para recordar com o grupo", text: "O ponto da vitória, a defesa impossível, a jogada que ninguém acredita. Fica guardado para rever e contar depois.", tone: "bg-surface text-fg", span: "lg:col-span-3" },
      { title: "Só fica o que escolhes", text: "O jogo nunca é gravado na íntegra e os vídeos apagam-se sozinhos. A tua jogada só fica se tu quiseres.", tone: "bg-mint text-bg", span: "lg:col-span-3" },
    ],
  },
  {
    id: "campo",
    chip: "Tenho um campo",
    statement: "Um lance que não fica registado perde-se para sempre.",
    intro:
      "Os seus clientes já querem guardar e partilhar o jogo. Sem replay, esse momento perde-se, e com ele a divulgação que poderia trazer ao seu clube. Com a Press2replay, cada lance vira um vídeo, cada vídeo divulga o seu clube e cada divulgação pode trazer uma nova reserva.",
    benefits: [
      { title: "Mais reservas", text: "Quem guarda e partilha o jogo quer repetir. O replay cria hábito e fidelização.", tone: "bg-surface text-fg", span: "lg:col-span-2" },
      { title: "Marketing em cada vídeo", text: "Os vídeos dos seus clientes passam a divulgar o seu campo nas redes sociais, de forma natural e sem custo de anúncio.", tone: "bg-brand text-bg", span: "lg:col-span-4", big: true },
      { title: "Torne-se referência", text: "Quando a experiência é melhor, o seu campo deixa de disputar por preço e passa a ser escolhido pelo nome. O jogador já não procura um campo livre, procura o seu.", tone: "bg-mint text-bg", span: "lg:col-span-3" },
      { title: "Divulgação sem esforço", text: "Cada lance partilhado nas redes pode levar o nome do seu campo junto, e chega exatamente a quem mais importa: os amigos de quem já é seu cliente. Sem gerar trabalho à sua equipa de marketing.", tone: "bg-surface text-fg", span: "lg:col-span-3" },
      { title: "Nova receita", text: "Espaço para patrocinadores locais no vídeo: ginásios, restaurantes, marcas de material.", tone: "bg-surface text-fg", span: "lg:col-span-3" },
      { title: "O seu cliente traz o próximo", text: "Ninguém indica melhor do que quem acabou de jogar. Cada vídeo partilhado é um convite para o próximo grupo.", tone: "bg-mint text-bg", span: "lg:col-span-3" },
    ],
  },
];

export function Benefits() {
  const [active, setActive] = useState<Tab["id"]>("campo");
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  function choose(id: Tab["id"]) {
    if (id === active) return;
    setActive(id);
    track("benefits_tab", { tab: id });
  }

  // Sem contentor por tras: a secao assenta no fundo da pagina. Em cima, o titulo, as abas e a
  // ideia; em baixo, mini cartoes (sem decoracao, so o grande leva um circulo).
  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-7">
          <h2 className="text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">Benefícios.</h2>
          <div role="tablist" aria-label="Benefícios para quem" className="mt-6 flex flex-wrap gap-2">
            {TABS.map((t) => {
              const selected = t.id === active;
              return (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="benefits-panel"
                  onClick={() => choose(t.id)}
                  className={`rounded-full px-6 py-3 text-lg font-bold transition-[background-color,color,transform] duration-300 active:scale-95 ${
                    selected ? "bg-brand text-bg" : "bg-surface text-fg hover:bg-border"
                  }`}
                >
                  {t.chip}
                </button>
              );
            })}
          </div>
          <p key={tab.id + "s"} className="reveal-in mt-8 max-w-[24ch] text-[clamp(26px,2.6vw,38px)] font-extrabold leading-[1.12] tracking-tight">
            {tab.statement}
          </p>
        </div>
        <p key={tab.id + "i"} className="reveal-in max-w-[52ch] self-end text-lg lg:col-span-5">
          {tab.intro}
        </p>
      </div>

      <ul key={tab.id} id="benefits-panel" role="tabpanel" aria-labelledby={`tab-${tab.id}`} className="mt-12 grid gap-3 lg:grid-cols-6">
        {tab.benefits.map((b, i) => (
          <li
            key={b.title}
            style={{ animationDelay: `${i * 70}ms` }}
            className={`${b.tone} ${b.span} reveal-in relative flex flex-col overflow-hidden rounded-[32px] p-8 ${
              b.big ? "min-h-[300px] lg:p-10" : "min-h-[220px]"
            }`}
          >
            {b.big && (
              <span aria-hidden className="absolute -bottom-[150px] -right-[110px] size-[400px] rounded-full bg-current opacity-[0.08]" />
            )}
            <h3
              className={`relative font-extrabold leading-[1.08] tracking-tight ${
                b.big ? "max-w-[16ch] text-[clamp(30px,3.4vw,48px)]" : "max-w-[20ch] text-[clamp(24px,2.2vw,32px)]"
              }`}
            >
              {b.title}
            </h3>
            <p className={`relative mt-3 max-w-[44ch] ${b.big ? "text-lg" : "text-base"}`}>{b.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
