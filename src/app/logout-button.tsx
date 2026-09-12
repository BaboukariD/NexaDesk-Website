"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="text-sm text-ink-muted underline underline-offset-2"
    >
      Sign out
    </button>
  );
}
