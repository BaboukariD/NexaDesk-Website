"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DialogueSummary = {
  id: number;
  title: string;
  _count: { lines: number };
  lesson: { number: number; unit: { number: number; book: { title: string } } };
};

export default function DialoguesPage() {
  const [dialogues, setDialogues] = useState<DialogueSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/dialogues")
      .then((r) => r.json())
      .then(setDialogues);
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Dialogues</h1>
        <Link href="/menu" className="text-sm text-ink-muted underline underline-offset-2">
          Menu
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Record yourself reading a line, then play it back.</p>

      <ul className="mt-6 divide-y divide-line">
        {dialogues?.map((d) => (
          <li key={d.id} className="py-3">
            <Link href={`/dialogues/${d.id}`} className="text-ink underline underline-offset-2">
              {d.title}
            </Link>
            <p className="mt-0.5 text-xs text-ink-muted">
              {d.lesson.unit.book.title} — unit {d.lesson.unit.number}, lesson {d.lesson.number} · {d._count.lines} lines
            </p>
          </li>
        ))}
        {dialogues && dialogues.length === 0 && (
          <p className="py-3 text-sm text-ink-muted">
            No dialogues yet — they come in through Upload when a lesson includes one.
          </p>
        )}
      </ul>
    </main>
  );
}
