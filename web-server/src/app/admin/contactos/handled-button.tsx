"use client";

import { useTransition } from "react";
import { toggleHandledAction } from "./actions";
import { secondaryButtonClass } from "../styles";

export function HandledButton({ id, handled }: { id: string; handled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleHandledAction(id, !handled))}
      className={secondaryButtonClass}
    >
      {handled ? "Respondido ✓" : "Marcar como respondido"}
    </button>
  );
}
