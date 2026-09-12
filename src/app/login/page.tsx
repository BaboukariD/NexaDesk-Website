"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Djibril", password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <h1 className="text-lg font-medium text-ink">Djibril</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to continue.</p>

        <label htmlFor="password" className="mt-8 block text-sm text-ink-muted">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={submitting || password.length === 0}
          className="mt-6 w-full rounded-md bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
