"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Progress = {
  wordsSeen: number;
  wordsKnown: number;
  weeklyAccuracy: { weekStart: string; accuracy: number; count: number }[];
  unitsProgress: { bookTitle: string; completedUnits: number; totalUnits: number }[];
  topWeaknesses: { description: string; frequency: number }[];
};

export default function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then(setProgress);
  }, []);

  if (!progress) return null;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Progress</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <section className="mt-8">
        <p className="text-sm text-ink-muted">Words known / seen</p>
        <p className="mt-1 text-2xl text-ink">
          {progress.wordsKnown} <span className="text-ink-muted">/ {progress.wordsSeen}</span>
        </p>
      </section>

      <section className="mt-8">
        <p className="text-sm text-ink-muted">Accuracy by week</p>
        <ul className="mt-2 space-y-1">
          {progress.weeklyAccuracy.length === 0 && <li className="text-sm text-ink-muted">No attempts yet.</li>}
          {progress.weeklyAccuracy.map((w) => (
            <li key={w.weekStart} className="flex justify-between text-sm">
              <span className="text-ink-muted">{w.weekStart}</span>
              <span className="text-ink">
                {Math.round(w.accuracy * 100)}% ({w.count})
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <p className="text-sm text-ink-muted">Current error patterns</p>
        <ul className="mt-2 space-y-1">
          {progress.topWeaknesses.length === 0 && <li className="text-sm text-ink-muted">None standing out.</li>}
          {progress.topWeaknesses.map((w, i) => (
            <li key={i} className="text-sm text-ink">
              {w.description}
            </li>
          ))}
        </ul>
        <Link href="/weaknesses" className="mt-2 inline-block text-sm text-ink-muted underline underline-offset-2">
          See details
        </Link>
      </section>

      <section className="mt-8">
        <p className="text-sm text-ink-muted">Units completed</p>
        <ul className="mt-2 space-y-1">
          {progress.unitsProgress.length === 0 && <li className="text-sm text-ink-muted">No books uploaded yet.</li>}
          {progress.unitsProgress.map((b) => (
            <li key={b.bookTitle} className="flex justify-between text-sm">
              <span className="text-ink-muted">{b.bookTitle}</span>
              <span className="text-ink">
                {b.completedUnits} / {b.totalUnits}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
