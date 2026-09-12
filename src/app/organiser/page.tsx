"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Topic = { id: number; slug: string; nameEn: string; nameAr: string };

export default function OrganiserIndexPage() {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Knowledge organisers</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>
      <ul className="mt-8 space-y-2">
        {topics.map((t) => (
          <li key={t.id}>
            <Link href={`/organiser/${t.slug}`} className="text-ink underline underline-offset-2">
              {t.nameEn}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
