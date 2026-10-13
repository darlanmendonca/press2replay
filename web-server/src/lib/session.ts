import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Camada de acesso a sessao (Data Access Layer). Le cookies/headers, entao so
// pode ser chamada dentro de um <Suspense> (Cache Components).
//
// ATENCAO: o guard do layout (admin/layout.tsx) NAO protege o conteudo das
// paginas - o que a pagina renderiza de estatico vai no payload da resposta
// mesmo sem sessao valida (o browser so e redirecionado). Toda consulta de
// dados de uma pagina/acao deve chamar requireStaff()/requireAdmin() ela mesma
// (e filtrar por clube); nunca confie so no layout ou no proxy.ts.
// Funcionario logado, ou null (sem redirect) - pra paginas publicas que
// reagem a sessao, como o /login.
export async function getStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireStaff() {
  const user = await getStaff();
  if (!user) redirect("/login");
  return user;
}

// Pra paginas que so admins podem ver (ex.: gerenciar funcionarios).
export async function requireAdmin() {
  const user = await requireStaff();
  if (!user.isAdmin) redirect("/admin");
  return user;
}
