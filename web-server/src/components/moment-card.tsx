"use client";

import { useState } from "react";
import type { PaymentInfo } from "./download-modal";
import { ReplayCard } from "./replay-card";

type Angle = {
  id: string;
  cameraId: string;
  durationSeconds: number | null;
  sprite: { frames: number; columns: number } | null;
};

// Um momento (aperto do botao): um card, e se a quadra tem mais de uma camera
// aparece o seletor de angulo (rotulado pelo cameraId). O card e o ReplayCard de
// sempre, com `key` pelo replay: ao trocar de angulo o preview e o play reiniciam.
export function MomentCard({
  createdAt,
  angles,
  payment,
  unlockedIds = [],
}: {
  createdAt: string;
  angles: Angle[];
  // Place com cobranca; `unlockedIds` = replays ja comprados neste dispositivo.
  payment?: PaymentInfo;
  unlockedIds?: string[];
}) {
  const [selected, setSelected] = useState(0);
  const angle = angles[selected] ?? angles[0];
  if (!angle) return null;
  const unlocked = unlockedIds.includes(angle.id);

  return (
    <div>
      {angles.length > 1 && (
        <div role="group" aria-label="Ângulos do replay" className="mb-3 flex flex-wrap gap-2">
          {angles.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={i === selected}
              className={`rounded-full border border-brand px-3 py-1 text-xs font-bold transition-colors ${
                i === selected ? "bg-brand text-bg" : "text-brand hover:bg-brand/10"
              }`}
            >
              {a.cameraId}
            </button>
          ))}
        </div>
      )}
      <ReplayCard
        key={angle.id}
        id={angle.id}
        createdAt={createdAt}
        durationSeconds={angle.durationSeconds}
        sprite={angle.sprite}
        payment={unlocked ? undefined : payment}
        purchased={Boolean(payment) && unlocked}
      />
    </div>
  );
}
