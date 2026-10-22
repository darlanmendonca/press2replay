import { ContactForm } from "@/components/contact-form";
import { Faq } from "@/components/landing/faq";
import { HeroDemo } from "@/components/landing/hero-demo";
import { DiscStack } from "@/components/landing/disc-stack";
import { Journey } from "@/components/landing/journey";
import { ReplayFragment } from "@/components/landing/replay-fragment";
import { RevealRoot } from "@/components/landing/reveal-root";
import { SportsCarousel } from "@/components/landing/sports-carousel";
import { PHOTO_CREDITS } from "@/lib/photo-credits";
import { Switches } from "@/components/landing/switches";

const NAV = [
  { href: "#como-e", label: "Como é" },
  { href: "#privacidade", label: "Privacidade" },
  { href: "#perguntas", label: "Perguntas" },
];

const YOU_CAN = [
  "Ver o replay assim que a jogada acaba",
  "Descarregar em vertical, para stories e Reels",
  "Partilhar com quem esteve em campo",
  "Tudo no telemóvel, sem instalar nada",
];

const wrap = "mx-auto max-w-[1440px] px-6 lg:px-8";
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

export default function Home() {
  return (
    <>
      <RevealRoot />

      <header className="sticky top-0 z-30 bg-bg">
        <div className={`${wrap} flex h-14 items-center justify-between`}>
          <a href="#" className="text-lg font-extrabold">
            press2<span className="text-brand">replay</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-base hover:text-brand">
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="#contacto"
            className="rounded-full bg-brand px-5 py-2 text-base font-bold text-bg transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <span className="md:hidden">No meu campo</span>
            <span className="max-md:hidden">Quero no meu campo</span>
          </a>
        </div>
      </header>

      <main>
        {/* Topo: a história inteira, a acontecer. */}
        <section className="overflow-hidden py-8 lg:py-10">
          <div className={`${wrap} grid items-center gap-12 lg:grid-cols-12 lg:gap-8`}>
            <div className="lg:col-span-6">
              <h1
                data-reveal
                className="text-[clamp(34px,4.4vw,72px)] font-extrabold leading-[0.98] tracking-[-0.03em]"
              >
                <span className="block">Carrega no botão.</span>
                <span className="block">Recebe o replay.</span>
              </h1>
              <p data-reveal style={delay(90)} className="mt-6 max-w-[36ch] text-lg">
                Fizeste uma jogada de ouro? Um botão ao lado do campo guarda o lance e envia o replay da jogada para o teu
                telemóvel, em segundos. Sem aplicação, sem editar nada.
              </p>
              <div data-reveal style={delay(180)} className="mt-8">
                <a
                  href="#como-e"
                  className="inline-flex h-14 items-center rounded-full bg-brand px-8 text-lg font-bold text-bg transition-transform hover:-translate-y-0.5 active:scale-95"
                >
                  Ver o replay a chegar
                </a>
              </div>
            </div>
            <div data-reveal style={delay(120)} className="lg:col-span-6">
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* Como é: do campo ao telemóvel */}
        <section id="como-e" className="scroll-mt-14 py-24 lg:py-40">
          <div className={`${wrap} grid gap-8 lg:grid-cols-12 lg:gap-6`}>
            <h2 data-reveal className="text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight lg:col-span-5">
              Do campo ao telemóvel.
            </h2>
            <p data-reveal style={delay(80)} className="max-w-[40ch] text-lg lg:col-span-5 lg:col-start-7">
              Quatro momentos, sem nada para fazer a não ser jogar. Escolhe um para ver o que acontece.
            </p>
          </div>
          <div data-reveal style={delay(120)} className={`${wrap} mt-12`}>
            <Journey />
          </div>
        </section>

        {/* Em qualquer campo: todos os desportos, num carrossel contínuo */}
        <section className="mx-3 overflow-hidden rounded-[40px] bg-forest py-20 lg:mx-6 lg:py-32">
          <div className={wrap}>
            <h2 data-reveal className="text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">
              Em qualquer campo.
            </h2>
            <p data-reveal style={delay(80)} className="mt-6 max-w-[44ch] text-lg">
              Onde houver um campo, há uma jogada que merece ser vista outra vez.
            </p>
          </div>
          <div data-reveal style={delay(120)} className="mt-12">
            <SportsCarousel />
          </div>
        </section>

        {/* O ecrã de replay */}
        <section className="mt-3 overflow-hidden rounded-[40px] bg-surface py-20 lg:mx-6 lg:mt-6 lg:py-32 max-lg:mx-3">
          <div className={`${wrap} relative grid items-center gap-16 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-6">
              <h2 data-reveal className="max-w-[14ch] text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">
                O teu replay, no telemóvel.
              </h2>
              <p data-reveal style={delay(80)} className="mt-6 max-w-[40ch] text-lg">
                Cada campo tem as câmaras e os botões certos para o desporto que lá se joga. Quando carregas num botão,
                o sistema corta a jogada e envia-ta pronta a ver.
              </p>
              <ul className="mt-8 flex flex-col gap-3 text-lg">
                {YOU_CAN.map((item, i) => (
                  <li key={item} data-reveal style={delay(140 + i * 70)} className="flex items-center gap-4">
                    <span aria-hidden className="size-3 shrink-0 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center lg:col-span-5 lg:col-start-8">
              <div data-reveal style={delay(120)} className="w-full max-w-[560px]">
                {/* o halo do topo, aqui centrado: círculo à frente e discos maiores atrás, concêntricos */}
                <DiscStack tones={["bg-leaf", "bg-forest"]} dir={[0, 0]}>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-brand">
                    <div className="w-[70%]">
                      <ReplayFragment />
                    </div>
                  </div>
                </DiscStack>
              </div>
            </div>
          </div>
        </section>

        {/* Privacidade, em interruptores */}
        <section id="privacidade" className="scroll-mt-14 py-24 lg:py-40">
          <div className={`${wrap} pb-12`}>
            <h2 data-reveal className="max-w-[16ch] text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">
              Só fica o teu lance.
            </h2>
            <p data-reveal style={delay(80)} className="mt-6 max-w-[44ch] text-lg">
              Liga e desliga para ver o que isso quer dizer na prática.
            </p>
          </div>
          <Switches />
        </section>

        {/* Perguntas */}
        <section id="perguntas" className="scroll-mt-14 pb-24 lg:pb-40">
          <div className={`${wrap} grid gap-12 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-5">
              <h2 data-reveal className="relative z-10 text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">
                As dúvidas dos jogadores.
              </h2>
              <div data-reveal style={delay(100)} className="mt-12 hidden w-[30%] lg:block">
                <div className="flex aspect-square items-center justify-center rounded-full bg-brand text-bg">
                  <svg viewBox="0 0 100 100" className="size-[40%]" aria-hidden>
                    <path d="M34 20 L82 50 L34 80 Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
            </div>
            <div data-reveal style={delay(100)} className="lg:col-span-7">
              <Faq />
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section id="contacto" className="scroll-mt-14 pb-24 lg:pb-40">
          <div className="mx-auto max-w-[1200px] px-3 lg:px-8">
            <div
              data-reveal
              className="relative overflow-hidden rounded-[40px] bg-brand p-6 text-bg lg:p-14"
            >
              <div aria-hidden className="pointer-events-none absolute -bottom-[42%] -left-[18%] w-[56%]">
                <DiscStack tones={["bg-mint/45", "bg-mint/25"]} grow={0.2} shift={0.05}>
                  <div className="size-full rounded-full bg-mint/60" />
                </DiscStack>
              </div>
              <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-16">
                <div className="flex flex-col justify-between gap-8">
                  <h2 className="max-w-[14ch] text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02] tracking-tight">
                    Quero isto no meu campo.
                  </h2>
                  <p className="max-w-[34ch] text-lg">
                    Jogas ou geres um campo e queres os replays das tuas jogadas? Diz-nos onde fica e falamos contigo.
                  </p>
                </div>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="mx-3 rounded-t-[40px] bg-brand text-bg lg:mx-6">
        <div className={`${wrap} grid gap-12 pb-10 pt-14 lg:grid-cols-12 lg:gap-6 lg:pt-20`}>
          <div className="lg:col-span-6">
            <a href="#" className="text-[28px] font-extrabold tracking-tight">
              press2replay
            </a>
            <p className="mt-3 max-w-[32ch] text-lg">Replay desportivo para clubes e campos.</p>
          </div>
          <nav aria-label="Explorar" className="lg:col-span-3 lg:col-start-10 lg:text-right">
            <p className="text-lg font-extrabold">Explorar</p>
            <ul className="mt-4 flex flex-col gap-3 text-base lg:items-end">
              <li><a href="#como-e" className="hover:underline">Como é</a></li>
              <li><a href="#privacidade" className="hover:underline">Privacidade</a></li>
              <li><a href="#perguntas" className="hover:underline">Perguntas</a></li>
              <li><a href="#contacto" className="hover:underline">Contacto</a></li>
            </ul>
          </nav>
        </div>
        <div className={`${wrap} flex flex-col gap-2 pb-8 text-base lg:flex-row lg:justify-between`}>
          <p>© 2026 Press2replay · Portugal. Todos os direitos reservados.</p>
          <p>Condições sujeitas a proposta.</p>
        </div>
        <p className={`${wrap} pb-8 text-sm`}>
          Fotografias:{" "}
          {PHOTO_CREDITS.map((c, i) => (
            <span key={c.page}>
              <a className="underline" href={c.page}>“{c.title}”</a>, {c.creator},{" "}
              <a className="underline" href={c.licenseUrl}>{c.license}</a>
              {i < PHOTO_CREDITS.length - 1 ? "; " : ". "}
            </span>
          ))}
          Via Wikimedia Commons e outras coleções abertas.
        </p>
      </footer>
    </>
  );
}
