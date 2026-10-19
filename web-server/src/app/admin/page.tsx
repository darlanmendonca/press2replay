import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/session";
import { cardClass } from "./styles";

export default function AdminPage() {
  return (
    <main className="py-10">
      <h1 className="text-3xl font-extrabold">
        Painel do <span className="text-brand">clube</span>
      </h1>
      <Suspense fallback={null}>
        <AdminHome />
      </Suspense>
    </main>
  );
}

async function AdminHome() {
  const user = await requireStaff();
  if (!user.isAdmin) {
    return <p className="mt-2 text-muted">As salas e os vídeos vão aparecer aqui.</p>;
  }
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      <li>
        <Link
          href="/admin/places"
          className={`${cardClass} block transition-colors hover:border-brand`}
        >
          <p className="text-lg font-bold">Places</p>
          <p className="mt-1 text-sm text-muted">
            Places, quadras, chaves de edge e replays enviados.
          </p>
        </Link>
      </li>
    </ul>
  );
}
