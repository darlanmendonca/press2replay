// Esportes aceitos no replay. O edge-server tem a mesma lista (e a duracao de
// cada um: 60s por padrao, padel 90s) em src/config.ts (SPORT_REPLAY_SECONDS) - manter as
// duas em sincronia.
export const SPORTS = ["futsal", "futebol", "padel", "basket"] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_LABELS: Record<Sport, string> = {
  futsal: "Futsal",
  futebol: "Futebol",
  padel: "Padel",
  basket: "Basket",
};

export function parseSport(value: unknown): Sport | null {
  return typeof value === "string" && (SPORTS as readonly string[]).includes(value)
    ? (value as Sport)
    : null;
}
