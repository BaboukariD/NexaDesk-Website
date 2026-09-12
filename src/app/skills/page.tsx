"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SkillRow = { skill: string; overallPct: number | null; eventCount: number; weaknesses: string[] };

const SKILL_LABELS: Record<string, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export default function SkillsPage() {
  const [rows, setRows] = useState<SkillRow[] | null>(null);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then(setRows);
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Skills</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <div className="mt-8 space-y-6">
        {rows?.map((r) => (
          <div key={r.skill} className="border-b border-line pb-4">
            <div className="flex items-baseline justify-between">
              <p className="text-ink">{SKILL_LABELS[r.skill]}</p>
              <p className="text-ink-muted">
                {r.overallPct === null ? "—" : `${Math.round(r.overallPct)}%`}
                {r.eventCount > 0 && <span className="ms-1 text-xs">({r.eventCount})</span>}
              </p>
            </div>
            {r.weaknesses.length > 0 && (
              <ul className="mt-2 space-y-1">
                {r.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-ink-muted">
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
