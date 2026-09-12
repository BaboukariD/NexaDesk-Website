"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Organiser = {
  topic: { nameEn: string; nameAr: string };
  vocab: { arabic: string; english: string; root: string | null }[];
  grammarNotes: { title: string; bodyAr: string; bodyEn: string }[];
  modelSentences: { ar: string | null; en: string | null }[];
};

export default function OrganiserPage() {
  const { topicSlug } = useParams<{ topicSlug: string }>();
  const [data, setData] = useState<Organiser | null>(null);

  useEffect(() => {
    fetch(`/api/organiser/${topicSlug}`)
      .then((r) => r.json())
      .then(setData);
  }, [topicSlug]);

  if (!data) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12 print:p-0">
      <div className="flex items-baseline justify-between print:hidden">
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
        <button onClick={() => window.print()} className="text-sm text-ink-muted underline underline-offset-2">
          Print
        </button>
      </div>

      <h1 className="mt-6 text-xl text-ink print:mt-0">
        {data.topic.nameEn} <span className="arabic-text" lang="ar">— {data.topic.nameAr}</span>
      </h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Vocabulary</h2>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
          {data.vocab.map((v, i) => (
            <p key={i} className="text-sm">
              <span className="arabic-text text-ink" lang="ar">{v.arabic}</span>{" "}
              <span className="text-ink-muted">— {v.english}</span>
            </p>
          ))}
          {data.vocab.length === 0 && <p className="text-sm text-ink-muted">None yet.</p>}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Grammar</h2>
        {data.grammarNotes.map((g, i) => (
          <div key={i} className="mt-2">
            <p className="text-sm text-ink">{g.title}</p>
            <p className="arabic-text text-sm text-ink" lang="ar">{g.bodyAr}</p>
            <p className="text-sm text-ink-muted">{g.bodyEn}</p>
          </div>
        ))}
        {data.grammarNotes.length === 0 && <p className="mt-2 text-sm text-ink-muted">None yet.</p>}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Model sentences</h2>
        {data.modelSentences.map((s, i) => (
          <p key={i} className="mt-2 text-sm">
            <span className="arabic-text text-ink" lang="ar">{s.ar}</span>{" "}
            <span className="text-ink-muted">— {s.en}</span>
          </p>
        ))}
        {data.modelSentences.length === 0 && <p className="mt-2 text-sm text-ink-muted">None yet.</p>}
      </section>
    </main>
  );
}
