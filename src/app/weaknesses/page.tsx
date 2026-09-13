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
type SlowItem = { arabic: string; avgResponseMs: number; samples: number };

export default function WeaknessesPage() {
  const [patterns, setPatterns] = useState<Weakness[] | null>(null);
  const [slowItems, setSlowItems] = useState<SlowItem[] | null>(null);

  useEffect(() => {
    fetch("/api/weaknesses")
      .then((r) => r.json())
      .then((data) => {
        setPatterns(data.patterns);
        setSlowItems(data.slowItems);
      });
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
        {patterns?.map((w) => (
          <li key={w.key} className="border-b border-line pb-4">
            <p className="text-ink">{w.description}</p>
            <p className="arabic-text mt-1 text-ink-muted" lang="ar">
              {w.exampleItems.join("، ")}
            </p>
            <p className="mt-1 text-xs text-ink-muted">seen {w.frequency} time{w.frequency === 1 ? "" : "s"}</p>
          </li>
        ))}
        {patterns && patterns.length === 0 && (
          <p className="text-sm text-ink-muted">Nothing standing out yet — keep drilling.</p>
        )}
      </ul>

      {slowItems && slowItems.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase text-ink-muted">Slow but correct</h2>
          <p className="mt-1 text-xs text-ink-muted">Right, but taking a while — these are the ones about to become wrong.</p>
          <ul className="mt-3 space-y-2">
            {slowItems.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between text-sm">
                <span className="arabic-text text-ink" lang="ar">{s.arabic}</span>
                <span className="text-ink-muted">{(s.avgResponseMs / 1000).toFixed(1)}s avg</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
