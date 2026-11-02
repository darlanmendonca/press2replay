"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { sendContactAction, type ContactState } from "@/app/contact-action";

// Campos sobre o cartao verde: um tom mais claro do fundo, sem linhas.
const field =
  "h-[52px] w-full rounded-2xl bg-mint/60 px-4 text-bg outline-none placeholder:text-bg/70 focus-visible:ring-2 focus-visible:ring-bg";

type ContactKind = "email" | "phone";

// Indicativos de pais (sem o "+"). Sao livres de prefixos entre si (E.164), por isso o primeiro que encaixar,
// de 1 a 3 digitos, e o certo.
const DIAL_CODES = new Set(
  (
    "1 7 20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 " +
    "90 91 92 93 94 95 98 212 213 216 218 220 221 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 " +
    "241 242 243 244 245 248 249 250 251 252 253 254 255 256 257 258 260 261 262 263 264 265 266 267 268 269 351 352 " +
    "353 354 355 356 357 358 359 370 371 372 373 374 375 376 377 378 380 381 382 385 386 387 389 420 421 423 852 853 " +
    "855 856 880 886 960 961 962 963 964 965 966 967 968 971 972 973 974 975 976 977 992 993 994 995 996 998"
  ).split(" "),
);

const DEFAULT_PREFIX = "+351 ";

// Separa um telefone em indicativo (se comecar por "+" ou "00") e numero.
function parsePhone(raw: string) {
  const trimmed = raw.trim();
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").slice(international && trimmed.startsWith("00") ? 2 : 0, 15 + 2);
  if (!international) return { international, code: null, national: digits.slice(0, 9) };
  const all = digits.slice(0, 15);
  const code = [1, 2, 3].map((n) => all.slice(0, n)).find((c) => DIAL_CODES.has(c)) ?? null;
  return { international, code, national: code ? all.slice(code.length) : all };
}

// Mascara do telefone: "912 345 678" (9 digitos, sem indicativo) ou "+351 912 345 678" (indicativo do pais
// reconhecido, e o resto em grupos de 3). "00" vira "+".
function maskPhone(raw: string) {
  const { international, code, national } = parsePhone(raw);
  let grouped = national.replace(/(\d{3})(?=\d)/g, "$1 ");
  // Numeros longos (ex.: Reino Unido, EUA): um digito sozinho no fim junta-se ao grupo anterior (3-3-4).
  if (international && national.length >= 10 && national.length % 3 === 1) grouped = grouped.replace(/ (\d)$/, "$1");
  if (!international) return grouped;
  if (!code) return `+${grouped}`;
  return national ? `+${code} ${grouped}` : `+${code}`;
}

// E-mail nao tem espacos nem maiusculas relevantes.
function maskEmail(raw: string) {
  return raw.replace(/\s/g, "").toLowerCase();
}

// Mesmas regras do servidor (contact-action.ts), para avisar antes de enviar.
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Devolve a mensagem de erro, ou null se o valor (nao vazio) for valido.
function contactError(kind: ContactKind, value: string) {
  if (kind === "email")
    return EMAIL_PATTERN.test(value) ? null : "Este e-mail não parece válido. Exemplo: nome@exemplo.pt";
  const { international, code, national } = parsePhone(value);
  // Portugal (ou sem indicativo) tem sempre 9 digitos; para os outros paises basta o total ficar entre 8 e 15.
  const valid = !international || code === "351" ? national.length === 9 : (code ?? "").length + national.length >= 8;
  return valid ? null : "Este telefone não parece válido. Exemplo: +351 912 345 678";
}

// Num telefone, "so o indicativo" conta como vazio.
function isEmptyContact(kind: ContactKind, value: string) {
  return kind === "phone" ? parsePhone(value).national === "" : value === "";
}

// Mensagem de erro por baixo de um campo (no lugar do balao nativo do browser).
function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-2 flex items-start gap-2 rounded-xl bg-bg px-3 py-2 text-sm font-bold text-white"
    >
      <span aria-hidden className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-brand text-xs text-bg">
        !
      </span>
      {children}
    </p>
  );
}

// Campo de texto obrigatorio. Vazio (ou so espacos) bloqueia o envio e mostra a mensagem por baixo, depois de
// sair do campo ou de tentar enviar.
function RequiredField({
  name,
  label,
  message,
  maxLength,
  multiline = false,
}: {
  name: string;
  label: string;
  message: string;
  maxLength: number;
  multiline?: boolean;
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const empty = value.trim() === "";
  const showError = touched && empty;
  const errorId = `${name}-error`;

  const common = {
    name,
    value,
    onBlur: () => setTouched(true),
    onInvalid: (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
    },
    required: true,
    maxLength,
    autoComplete: "off",
    placeholder: label,
    "aria-label": label,
    "aria-invalid": showError,
    "aria-describedby": showError ? errorId : undefined,
  };

  return (
    <div>
      {multiline ? (
        <textarea
          {...common}
          onChange={(e) => setValue(e.target.value)}
          ref={(el) => el?.setCustomValidity(empty ? message : "")}
          rows={3}
          className={`${field} h-[200px] resize-none rounded-2xl py-3`}
        />
      ) : (
        <input
          {...common}
          onChange={(e) => setValue(e.target.value)}
          ref={(el) => el?.setCustomValidity(empty ? message : "")}
          className={field}
        />
      )}
      {showError && <FieldError id={errorId}>{message}</FieldError>}
    </div>
  );
}

const KINDS: { value: ContactKind; label: string }[] = [
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
];

// Campo de contacto com o seletor E-mail / Telefone dentro dele (radios nativos escondidos, acessiveis por
// teclado). O valor e a mascara mudam com o tipo escolhido.
function ContactField() {
  const [kind, setKind] = useState<ContactKind>("email");
  const [value, setValue] = useState("");
  // So mostramos o erro depois de sair do campo (ou de tentar enviar), para nao avisar a meio da escrita.
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const phone = kind === "phone";
  const empty = isEmptyContact(kind, value);
  const error = empty ? "Indica como te podemos contactar." : contactError(kind, value);
  const showError = touched && error !== null;

  return (
    <fieldset>
      <legend className="sr-only">Contacto</legend>
      <div className="relative">
        <input
          name="contact"
          value={value}
          onChange={(e) => setValue(phone ? maskPhone(e.target.value) : maskEmail(e.target.value))}
          onBlur={() => !empty && setTouched(true)}
          // Sem o balao do browser: um valor invalido bloqueia o envio e mostra a nossa mensagem.
          onInvalid={(e) => {
            e.preventDefault();
            setTouched(true);
          }}
          ref={(el) => {
            input.current = el;
            // Campo vazio: o `required` nativo trata. Com so o indicativo, `error` pede o contacto.
            el?.setCustomValidity(value === "" ? "" : (error ?? ""));
          }}
          // `text` (nao `email`/`tel`) para o browser nao validar o formato; o teclado vem do inputMode.
          type="text"
          inputMode={phone ? "tel" : "email"}
          aria-invalid={showError}
          aria-describedby={showError ? "contact-error" : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={phone ? 24 : 200}
          placeholder="Contacto"
          aria-label="Contacto"
          className={`${field} pr-[172px]`}
        />
        <div className="absolute right-1.5 top-1.5 flex gap-1">
          {KINDS.map((k) => (
            <label
              key={k.value}
              className="flex h-10 cursor-pointer items-center rounded-xl px-3 text-sm font-bold text-bg transition-colors has-[:checked]:bg-bg has-[:checked]:text-brand has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bg"
            >
              <input
                type="radio"
                name="contactKind"
                value={k.value}
                checked={kind === k.value}
                onChange={() => {
                  setKind(k.value);
                  setValue(k.value === "phone" ? DEFAULT_PREFIX : "");
                  setTouched(false);
                  input.current?.focus();
                }}
                className="sr-only"
              />
              {k.label}
            </label>
          ))}
        </div>
      </div>
      {showError && <FieldError id="contact-error">{error}</FieldError>}
    </fieldset>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(async (prev: ContactState, formData: FormData) => {
    const result = await sendContactAction(prev, formData);
    if (result.sent) track("contact_sent");
    return result;
  }, {});

  if (state.sent) {
    return (
      <div className="flex min-h-[200px] flex-col justify-center gap-2">
        <p className="text-[clamp(36px,4vw,60px)] font-extrabold leading-[1.02]">Recebido</p>
        <p className="text-lg">Obrigado! Falamos contigo em breve.</p>
      </div>
    );
  }

  return (
    <form
      // Em vez de `action={action}`: o React 19 limpa o formulario depois de cada envio, mesmo com erro,
      // e o utilizador perderia o que escreveu (e o radio nativo voltava ao valor inicial).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="flex flex-col gap-[10px]"
    >
      <RequiredField name="name" label="Pessoa a contactar" message="Indica a pessoa a contactar." maxLength={120} />
      <ContactField />
      <RequiredField name="club" label="O teu campo ou clube" message="Indica o teu campo ou clube." maxLength={120} />
      <RequiredField
        name="message"
        label="Onde fica? Que desporto jogas ou tens em campo? Conta-nos um pouco."
        message="Conta-nos um pouco sobre o campo."
        maxLength={3000}
        multiline
      />
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
