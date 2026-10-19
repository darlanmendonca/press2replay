"use client";

import { useActionState } from "react";
import { inputClass, primaryButtonClass } from "../styles";
import { createVenueAction, type FormState } from "./actions";

const initialState: FormState = {};

export function NewVenueForm() {
  const [state, formAction, pending] = useActionState(createVenueAction, initialState);

  return (
    <form action={formAction} autoComplete="off" className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nome
        <input name="name" required maxLength={120} placeholder="Arena Central" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Id (vai na URL e no QR; não pode ser alterado depois)
        <input
          name="id"
          required
          maxLength={64}
          pattern="[A-Za-z0-9_\-]{1,64}"
          title="Letras, números, - e _"
          placeholder="arena-central"
          className={`${inputClass} font-mono`}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${primaryButtonClass} self-start`}>
        {pending ? "A criar…" : "Criar place"}
      </button>
    </form>
  );
}
