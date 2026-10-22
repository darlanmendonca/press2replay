"use client";

import { useActionState } from "react";
import { track } from "@vercel/analytics";
import { sendContactAction, type ContactState } from "@/app/contact-action";

// Campos sobre o cartao verde: um tom mais claro do fundo, sem linhas.
const field =
  "h-[52px] w-full rounded-2xl bg-mint/60 px-4 text-bg outline-none placeholder:text-bg/70 focus-visible:ring-2 focus-visible:ring-bg lg:h-[52px]";

export function ContactForm() {
  const [state, action, pending] = useActionState(
    async (prev: ContactState, formData: FormData) => {
      const result = await sendContactAction(prev, formData);
      if (result.sent) track("contact_sent");
      return result;
    },
    {},
  );

  if (state.sent) {
    return (
      <div className="flex min-h-[200px] flex-col justify-center gap-2">
        <p className="text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02]">Recebido</p>
        <p className="text-lg">Obrigado! Falamos contigo em breve.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-[10px]">
      <label>
        <span className="sr-only">O teu nome</span>
        <input name="name" required maxLength={120} autoComplete="off" placeholder="O teu nome" className={field} />
      </label>
      <label>
        <span className="sr-only">E-mail</span>
        <input name="email" type="email" required maxLength={200} autoComplete="off" placeholder="E-mail" className={field} />
      </label>
      <label>
        <span className="sr-only">O teu campo ou clube</span>
        <input name="club" required maxLength={120} autoComplete="off" placeholder="O teu campo ou clube" className={field} />
      </label>
      <label>
        <span className="sr-only">Mensagem</span>
        <textarea
          name="message"
          autoComplete="off"
          rows={3}
          maxLength={3000}
          placeholder="Onde fica e que desporto jogas? (opcional)"
          className={`${field} h-[200px] resize-none rounded-2xl py-3`}
        />
      </label>
      {/* Honeypot: escondido para pessoas, bots costumam preencher. */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-base font-bold">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-14 rounded-2xl bg-bg px-6 text-lg font-bold text-brand transition-transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "A enviar…" : "Quero isto no meu campo"}
      </button>
    </form>
  );
}
