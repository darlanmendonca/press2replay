import type { Replay } from "@/db/schema";

// Um MOMENTO e um aperto do botao da quadra: um replay por camera (angulo), todos
// com o mesmo `momentId`. Replays antigos (de antes das cameras) sao momentos
// de um angulo so.
export type Moment = {
  id: string;
  createdAt: Date; // o mais cedo entre os angulos: eles registram com segundos de diferenca
  angles: Replay[];
};

// Agrupa por momento: momentos do mais novo pro mais antigo, angulos por cameraId.
export function groupMoments(rows: Replay[]): Moment[] {
  const byMoment = new Map<string, Replay[]>();
  for (const row of rows) {
    const angles = byMoment.get(row.momentId);
    if (angles) angles.push(row);
    else byMoment.set(row.momentId, [row]);
  }

  return [...byMoment.entries()]
    .map(([id, angles]) => ({
      id,
      createdAt: new Date(Math.min(...angles.map((a) => a.createdAt.getTime()))),
      angles: angles.sort((a, b) => a.cameraId.localeCompare(b.cameraId)),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Props serializaveis (servidor -> componente cliente) do MomentCard.
export function momentCardProps(moment: Moment) {
  return {
    createdAt: moment.createdAt.toISOString(),
    angles: moment.angles.map((r) => ({
      id: r.id,
      cameraId: r.cameraId,
      durationSeconds: r.durationSeconds,
      sprite:
        r.spritePath && r.spriteFrames && r.spriteColumns
          ? { frames: r.spriteFrames, columns: r.spriteColumns }
          : null,
    })),
  };
}
