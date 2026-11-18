"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { formatPrice, PACK_PRICE_CENTS, SINGLE_PRICE_CENTS, type DownloadPlan } from "@/lib/pricing";

export type PaymentInfo = { venueId: string; courtId: string; replayCount: number };

// Modal de escolha do download pago: este replay ou o pacote da quadra. Usa o
// <dialog> nativo (foco preso, Esc e backdrop de graca). Ao escolher, cria a
// Checkout Session no servidor e redireciona pra pagina do Stripe (cartao,
// Apple/Google Pay, MB WAY). O atleta tem de aceitar o acesso imediato antes:
// em conteudo digital isso faz perder o direito de arrependimento (UE).
export function DownloadModal({
  open,
  onClose,
  replayId,
  payment,
}: {
  open: boolean;
  onClose: () => void;
  replayId: string;
  payment: PaymentInfo;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState<DownloadPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function choose(plan: DownloadPlan) {
    if (loading) return;
    setError(null);
    setLoading(plan);
    track("download_plan_selected", { plan, replayId });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          venueId: payment.venueId,
          courtId: payment.courtId,
          replayId: plan === "single" ? replayId : undefined,
          consent: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Não foi possível iniciar o pagamento. Tente novamente.");
        setLoading(null);
        return;
      }
      window.location.assign(data.url); // segue loading ate sair da pagina
    } catch {
      setError("Sem ligação. Verifique a internet e tente novamente.");
      setLoading(null);
    }
  }

  const busy = loading !== null;
  const disabled = !consent || busy;

  // Fecha o <dialog> direto (nao so via estado do pai + effect): o ✕ e o clique
  // no backdrop nao dependem de o React re-renderizar pra funcionar. O evento
  // `close` do dialog avisa o pai; o onClose() explicito cobre o caso do
  // dialog ja estar fechado mas o estado do pai ainda "aberto".
  function dismiss() {
    if (busy) return;
    ref.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && dismiss()}
      aria-labelledby="download-modal-title"
      className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-surface p-0 text-fg backdrop:bg-black/70"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="download-modal-title" className="text-xl font-extrabold">
            Baixar replay
          </h2>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            aria-label="Fechar"
            className="-m-2 p-2 text-muted transition-colors hover:text-fg disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <PlanButton
            title="Este replay"
            detail="Só este vídeo"
            price={SINGLE_PRICE_CENTS}
            loading={loading === "single"}
            disabled={disabled}
            onClick={() => choose("single")}
          />
          <PlanButton
            title="Pacote completo"
            detail={
              payment.replayCount > 1
                ? `Todos os ${payment.replayCount} replays desta quadra, e os das próximas horas`
                : "Todos os replays desta quadra, e os das próximas horas"
            }
            price={PACK_PRICE_CENTS}
            highlight
            loading={loading === "pack"}
            disabled={disabled}
            onClick={() => choose("pack")}
          />
        </div>

        <label className="mt-5 flex items-start gap-3 text-xs text-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          <span>
            Aceito o acesso imediato ao conteúdo digital e que, ao fazê-lo, perco o direito de
            livre resolução de 14 dias.
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs text-muted">
          Pagamento seguro por cartão, Apple Pay, Google Pay ou MB WAY. Preços com IVA incluído.
        </p>
      </div>
    </dialog>
  );
}

function PlanButton({
  title,
  detail,
  price,
  highlight,
  loading,
  disabled,
  onClick,
}: {
  title: string;
  detail: string;
  price: number;
  highlight?: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        highlight
          ? "border-brand bg-brand/10 enabled:hover:bg-brand/20"
          : "border-border enabled:hover:border-brand"
      }`}
    >
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-muted">{loading ? "A abrir o pagamento…" : detail}</span>
      </span>
      <span className="text-lg font-extrabold text-brand">{formatPrice(price)}</span>
    </button>
  );
}
