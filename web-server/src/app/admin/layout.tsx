import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  // A sessao le cookies, entao fica atras de um Suspense (Cache Components).
  return (
    <Suspense fallback={<p className="p-6 text-muted">A carregar…</p>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const fullName = `${user.name} ${user.lastName}`;
  const initials = `${user.name[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6">
      <header className="flex items-center justify-between border-b border-border py-4">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-extrabold">
            press2<span className="text-brand">replay</span>
          </Link>
          {user.isAdmin && (
            <Link href="/admin/places" className="text-sm text-muted transition-colors hover:text-brand">
              Places
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span
            title={`${fullName}${user.isAdmin ? " · admin" : ""}`}
            aria-label={fullName}
            className="flex size-8 items-center justify-center rounded-full bg-surface text-xs font-bold text-brand"
          >
            {initials}
          </span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
