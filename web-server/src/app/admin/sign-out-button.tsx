"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-muted transition-colors hover:text-brand"
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
