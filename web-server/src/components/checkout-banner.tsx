"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";

type Result = "paid" | "failed";

const POLL_MS = 2000;
const MAX_TRIES = 15; // ~30s: MB WAY pode demorar a ser aprovado na app

// Aviso no topo da pagina da quadra ao voltar do Stripe (?checkout=...). No
// sucesso confirma o pagamento (o servidor grava o cookie de acesso) e atualiza
// a pagina: os cards passam a baixar direto.
export function CheckoutBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const checkout = params.get("checkout");
  const sessionId = params.get("session_id");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (checkout !== "success" || !sessionId) return;

    let stop = false;
    let tries = 0;
    (async () => {
      while (!stop && tries++ < MAX_TRIES) {
        try {
          const res = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`);
          const { status } = (await res.json()) as { status: "paid" | "pending" | "failed" };
          if (status === "paid") {
            track("purchase_completed");
            if (!stop) {
              setResult("paid");
              router.replace(pathname, { scroll: false });
              router.refresh();
            }
            return;
          }
          if (status === "failed") break;
        } catch {
          // rede falhou: tenta de novo
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!stop) setResult("failed");
    })();
    return () => {
      stop = true;
    };
  }, [checkout, sessionId, pathname, router]);

  // "A confirmar" e "cancelado" vem direto da URL; o resultado fica em estado
  // (a URL e limpa quando o pagamento e confirmado).
  const state =
    result ?? (checkout === "success" && sessionId ? "confirming" : checkout === "cancelled" ? "cancelled" : null);
  if (!state) return null;

  const base = "mt-6 rounded-2xl border p-4 text-sm";
  if (state === "confirming") {
    return (
      <p role="status" className={`${base} border-border bg-surface text-muted`}>
        A confirmar o pagamento… Não feche esta página.
      </p>
    );
  }
  if (state === "paid") {
    return (
      <p role="status" className={`${base} border-brand bg-brand/10 font-bold text-brand`}>
        Pagamento confirmado. Já pode baixar.
      </p>
    );
  }
  if (state === "cancelled") {
    return (
      <p role="status" className={`${base} border-border bg-surface text-muted`}>
        Pagamento cancelado. Não foi cobrado nada.
      </p>
    );
  }
  return (
    <p role="alert" className={`${base} border-red-400 text-red-400`}>
      Não conseguimos confirmar o pagamento. Se foi cobrado, aguarde um minuto e recarregue a
      página; se o problema continuar, contacte-nos.
    </p>
  );
}
