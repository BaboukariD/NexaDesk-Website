"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type VocabResult = {
  kind: "vocab";
  id: number;
  arabic: string;
  english: string;
  source: string | null;
  accuracy: number | null;
  dueDate: string | null;
  sticky: boolean;
};
type LineResult = { kind: string; id: number; arabic: string; english: string; context: string };

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [vocab, setVocab] = useState<VocabResult[] | null>(null);
  const [lines, setLines] = useState<LineResult[] | null>(null);

  useEffect(() => {
    if (!q) return;
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => {
        setVocab(data.vocab);
        setLines(data.lines);
      });
  }, [q]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Search: {q}</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Vocabulary</h2>
        <ul className="mt-2 divide-y divide-line">
          {vocab?.map((v) => (
            <li key={v.id} className="py-3">
              <div className="flex items-baseline justify-between">
                <span className="arabic-text text-lg text-ink" lang="ar">
                  {v.arabic}
                </span>
                <span className="text-sm text-ink-muted">{v.english}</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {v.source ?? "manual"}
                {v.accuracy !== null && ` — ${Math.round(v.accuracy * 100)}% accuracy`}
                {v.dueDate && ` — due ${new Date(v.dueDate).toLocaleDateString()}`}
                {v.sticky && " — sticky"}
              </p>
              <div className="mt-1 flex gap-3">
                <Link href="/vocab" className="text-xs text-ink underline underline-offset-2">
                  View in vocabulary
                </Link>
                <Link href="/flashcards" className="text-xs text-ink underline underline-offset-2">
                  Review now
                </Link>
              </div>
            </li>
          ))}
          {vocab && vocab.length === 0 && <p className="py-3 text-sm text-ink-muted">No vocabulary matches.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Dialogues & sentences</h2>
        <ul className="mt-2 divide-y divide-line">
          {lines?.map((l) => (
            <li key={`${l.kind}-${l.id}`} className="py-3">
              <p className="arabic-text text-ink" lang="ar">
                {l.arabic}
              </p>
              <p className="text-sm text-ink-muted">
                {l.english} — <span className="text-xs">{l.context}</span>
              </p>
            </li>
          ))}
          {lines && lines.length === 0 && <p className="py-3 text-sm text-ink-muted">No matches.</p>}
        </ul>
      </section>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
