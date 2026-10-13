import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Redirect OTIMISTA: so olha se existe o cookie de sessao, nao o valida (um
// cookie forjado passa aqui). A validacao de verdade acontece no servidor, em
// src/lib/session.ts, dentro de cada pagina/acao protegida.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
