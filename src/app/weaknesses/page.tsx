"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Weakness = {
  key: string;
  description: string;
  exampleItems: string[];
  frequency: number;
  lastSeen: string;
};

export default function WeaknessesPage() {
  const [weaknesses, setWeaknesses] = useState<Weakness[] | null>(null);

  useEffect(() => {
    fetch("/api/weaknesses")
      .then((r) => r.json())
      .then(setWeaknesses);
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">What you keep getting wrong</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <ul className="mt-8 space-y-6">
        {weaknesses?.map((w) => (
          <li key={w.key} className="border-b border-line pb-4">
            <p className="text-ink">{w.description}</p>
            <p className="arabic-text mt-1 text-ink-muted" lang="ar">
              {w.exampleItems.join("، ")}
            </p>
            <p className="mt-1 text-xs text-ink-muted">seen {w.frequency} time{w.frequency === 1 ? "" : "s"}</p>
          </li>
        ))}
        {weaknesses && weaknesses.length === 0 && (
          <p className="text-sm text-ink-muted">Nothing standing out yet — keep drilling.</p>
        )}
      </ul>
    </main>
  );
}
