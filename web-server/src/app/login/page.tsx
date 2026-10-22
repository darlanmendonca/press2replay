import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-brand">Press2Replay</p>
        <h1 className="mt-2 text-3xl font-extrabold">Entrar</h1>
        <p className="mt-1 text-muted">Acesso para funcionários do clube.</p>
      </div>
      {/* Ler a sessao usa cookies, entao fica atras de um Suspense (Cache Components). */}
      <Suspense fallback={<div className="h-52" />}>
        <LoginGate />
      </Suspense>
    </main>
  );
}

// Ja logado -> /admin; senao mostra o formulario. A sessao e validada de
// verdade (nao so o cookie), entao um cookie expirado/forjado nao cria loop
// com o redirect de /admin pra /login.
async function LoginGate() {
  if (await getStaff()) redirect("/admin");
  return <LoginForm />;
}
