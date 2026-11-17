// Precos de download (so quando `venue.requireDownloadPayment`). Valores em centimos de
// euro. O pacote tem preco fixo, independente de quantos replays haja. Usado
// pelo modal (cliente) e, no proximo passo, pelo Checkout (servidor): o preco
// que vale e sempre o do servidor, nunca o que o browser mandar.
export const CURRENCY = "eur";
export const SINGLE_PRICE_CENTS = 200;
export const PACK_PRICE_CENTS = 700;

export type DownloadPlan = "single" | "pack";

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}
