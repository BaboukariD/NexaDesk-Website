"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Option = { id: number; arabic: string; gloss: string };
type Column = { id: number; order: number; label: string; options: Option[] };
type SetData = { id: number; titleAr: string; topic: { nameEn: string }; columns: Column[] };

export default function SentenceBuilderPage() {
  const [sets, setSets] = useState<SetData[] | null>(null);
  const [selected, setSelected] = useState<Record<number, Option>>({});

  useEffect(() => {
    fetch("/api/sentence-builder")
      .then((r) => r.json())
      .then(setSets);
  }, []);

  function pick(columnId: number, option: Option) {
    setSelected((prev) => ({ ...prev, [columnId]: option }));
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Sentence builder</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Pick one from each column, then read the result aloud.
      </p>

      {sets?.map((set) => {
        const composed = set.columns
          .map((c) => selected[c.id])
          .filter(Boolean) as Option[];
        return (
          <div key={set.id} className="mt-8">
            <p className="text-sm text-ink-muted">{set.topic.nameEn}</p>
            <p className="arabic-text text-xl text-ink" lang="ar">
              {set.titleAr}
            </p>

            <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${set.columns.length}, 1fr)` }}>
              {set.columns.map((col) => (
                <div key={col.id}>
                  <p className="text-xs uppercase text-ink-muted">{col.label}</p>
                  <div className="mt-1 flex flex-col gap-1">
                    {col.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => pick(col.id, opt)}
                        className={
                          "arabic-text rounded-md border px-2 py-1 text-start text-sm " +
                          (selected[col.id]?.id === opt.id ? "border-accent text-accent" : "border-line text-ink")
                        }
                        lang="ar"
                      >
                        {opt.arabic}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {composed.length === set.columns.length && (
              <div className="mt-6 border-t border-line pt-4">
                <p className="arabic-text text-2xl text-ink" lang="ar">
                  {composed.map((o) => o.arabic).join(" ")}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{composed.map((o) => o.gloss).join(" ")}</p>
              </div>
            )}
          </div>
        );
      })}
      {sets && sets.length === 0 && <p className="mt-8 text-sm text-ink-muted">No sentence-builder sets yet.</p>}
    </main>
  );
}
