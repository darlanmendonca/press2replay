import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade · Press2replay",
  description: "Como o Press2replay trata os dados do formulário de contacto e dos replays.",
};

const h2 = "mt-10 text-2xl font-extrabold tracking-tight";

// RASCUNHO: confirmar com quem trata da parte juridica da empresa (identificacao do
// responsavel, contacto para exercer direitos e eventuais subcontratantes) antes de divulgar.
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 py-16 text-lg lg:py-24">
      <Link href="/" className="text-base font-extrabold">
        press2<span className="text-brand">replay</span>
      </Link>
      <h1 className="mt-10 text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.05] tracking-tight">
        Política de privacidade
      </h1>
      <p className="mt-4 text-muted">Última atualização: outubro de 2026.</p>

      <h2 className={h2}>Quem é o responsável</h2>
      <p className="mt-3">
        O Press2replay, com sede em Portugal, é o responsável pelo tratamento dos dados descritos aqui. Para exercer
        qualquer um dos direitos abaixo, usa o formulário de contacto da página inicial e indica que o pedido é sobre
        privacidade.
      </p>

      <h2 className={h2}>Formulário de contacto</h2>
      <p className="mt-3">
        Quando pedes uma proposta, guardamos o teu nome, o nome do clube ou campo, o e-mail e a mensagem que escreveres.
        Usamo-los só para te responder. A base legal é a tua iniciativa de nos contactar (diligências pré-contratuais).
      </p>
      <p className="mt-3">
        Guardamos também uma versão cifrada do teu endereço de IP (não o endereço em si), só para travar pedidos em
        massa. Não é usada para te identificar.
      </p>
      <p className="mt-3">Apagamos o pedido ao fim de 12 meses, ou antes se nos pedires.</p>

      <h2 className={h2}>Replays dos jogos</h2>
      <p className="mt-3">
        As câmaras do campo não gravam o jogo na íntegra: só os últimos instantes ficam em memória e são apagados continuamente.
        Só o momento pedido ao carregar no botão, de 1 minuto e 30 segundos ou 1 minuto conforme o desporto, é guardado, sem som e sem reconhecimento facial, e
        é apagado passado pouco tempo. Quem abrir a página de replays do campo nesse período pode ver os vídeos.
      </p>

      <h2 className={h2}>Com quem partilhamos</h2>
      <p className="mt-3">
        Os dados ficam em prestadores de alojamento e base de dados (Vercel e Neon) que tratam a informação em nosso
        nome. Não vendemos dados nem os usamos para publicidade.
      </p>

      <h2 className={h2}>Os teus direitos</h2>
      <p className="mt-3">
        Podes pedir acesso, retificação ou apagamento dos teus dados, opor-te ao tratamento ou pedir a limitação do
        mesmo. Se achares que tratámos mal os teus dados, podes reclamar junto da Comissão Nacional de Proteção de
        Dados (CNPD).
      </p>
    </main>
  );
}
