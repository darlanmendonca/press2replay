"use client";

import { useActionState, useState } from "react";
import { SPORTS, SPORT_LABELS } from "@/lib/sports";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "../../styles";
import {
  createCourtAction,
  rotateEdgeKeyAction,
  updateCourtAction,
  updateVenueAction,
  type FormState,
} from "../actions";

const initialState: FormState = {};

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {state.error}
      </p>
    );
  }
  if (state.saved) {
    return (
      <p role="status" className="text-sm text-brand">
        Guardado.
      </p>
    );
  }
  return null;
}

function SportSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="sport" required defaultValue={defaultValue ?? ""} className={inputClass}>
      <option value="" disabled>
        Esporte padrão…
      </option>
      {SPORTS.map((sport) => (
        <option key={sport} value={sport}>
          {SPORT_LABELS[sport]}
        </option>
      ))}
    </select>
  );
}

export function EditVenueForm({ venueId, name }: { venueId: string; name: string }) {
  const [state, formAction, pending] = useActionState(
    updateVenueAction.bind(null, venueId),
    initialState,
  );
  return (
    <form action={formAction} autoComplete="off" className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm">
        Nome
        <input name="name" required maxLength={120} defaultValue={name} className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className={secondaryButtonClass}>
        {pending ? "A guardar…" : "Guardar nome"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function NewCourtForm({ venueId }: { venueId: string }) {
  const [state, formAction, pending] = useActionState(
    createCourtAction.bind(null, venueId),
    initialState,
  );
  return (
    <form action={formAction} autoComplete="off" className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Id (imutável)
          <input
            name="id"
            required
            maxLength={64}
            pattern="[A-Za-z0-9_\-]{1,64}"
            title="Letras, números, - e _"
            placeholder="1"
            className={`${inputClass} font-mono`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input name="name" required maxLength={120} placeholder="Quadra 1" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Esporte padrão
          <SportSelect />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "A criar…" : "Adicionar quadra"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function CourtRow({
  venueId,
  courtId,
  name,
  sport,
}: {
  venueId: string;
  courtId: string;
  name: string;
  sport: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateCourtAction.bind(null, venueId, courtId),
    initialState,
  );
  const publicPath = `/replays/${venueId}/${courtId}`;

  return (
    <li className="rounded-xl border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-mono text-muted">id: {courtId}</span>
        <a
          href={publicPath}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-brand hover:underline"
        >
          {publicPath}
        </a>
      </div>
      <form action={formAction} autoComplete="off" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          Nome
          <input name="name" required maxLength={120} defaultValue={name} className={inputClass} />
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-sm">
          Esporte padrão
          <SportSelect defaultValue={sport} />
        </label>
        <button type="submit" disabled={pending} className={secondaryButtonClass}>
          {pending ? "A guardar…" : "Guardar"}
        </button>
        <Feedback state={state} />
      </form>
    </li>
  );
}

export function EdgeKeyPanel({
  venueId,
  hasKey,
  createdAt,
}: {
  venueId: string;
  hasKey: boolean;
  createdAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    rotateEdgeKeyAction.bind(null, venueId),
    initialState,
  );
  const [copied, setCopied] = useState(false);

  const snippet = state.edgeKey ? `VENUE_ID=${venueId}\nEDGE_API_KEY=${state.edgeKey}` : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      setCopied(false); // sem permissao de clipboard: o utilizador copia o texto a mao
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {hasKey
          ? `Chave ativa, criada em ${createdAt}. Só o hash fica guardado: não dá para a ver outra vez.`
          : "Este place ainda não tem chave. Sem ela o edge não consegue enviar replays."}
      </p>

      {state.edgeKey && (
        <div className="flex flex-col gap-2 rounded-lg border border-brand p-3">
          <p className="text-sm font-bold text-brand">
            Copie já: esta chave não volta a aparecer.
          </p>
          <pre className="overflow-x-auto rounded bg-bg p-3 font-mono text-xs">{snippet}</pre>
          <button type="button" onClick={copy} className={`${secondaryButtonClass} self-start`}>
            {copied ? "Copiado" : "Copiar"}
          </button>
          <p className="text-xs text-muted">
            Cole no <code>.env</code> do edge (junto com <code>COURT_ID</code> e <code>SPORT</code>) e
            reinicie-o.
          </p>
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}

      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            hasKey &&
            !window.confirm("Gerar uma chave nova? A chave atual deixa de funcionar imediatamente.")
          ) {
            event.preventDefault();
          }
        }}
      >
        <button type="submit" disabled={pending} className={`${secondaryButtonClass}`}>
          {pending ? "A gerar…" : hasKey ? "Gerar nova chave" : "Gerar chave"}
        </button>
      </form>
    </div>
  );
}
