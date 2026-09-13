"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Backup = { id: number; trigger: string; createdAt: string };

export default function ExportPage() {
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [running, setRunning] = useState(false);

  function load() {
    fetch("/api/export/backups").then((r) => r.json()).then(setBackups);
  }

  useEffect(load, []);

  async function backupNow() {
    setRunning(true);
    try {
      await fetch("/api/export/backup-now", { method: "POST" });
      load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Export & backup</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Everything you type is learning data you can't recreate.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/api/export/csv" className="rounded-md border border-line px-4 py-2 text-sm text-ink">
          Vocabulary as CSV
        </a>
        <a href="/api/export/json" className="rounded-md border border-line px-4 py-2 text-sm text-ink">
          Full export as JSON
        </a>
        <button onClick={backupNow} disabled={running} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
          {running ? "Running…" : "Back up now"}
        </button>
      </div>

      <h2 className="mt-8 text-sm font-medium uppercase text-ink-muted">Automatic backups</h2>
      <p className="mt-1 text-sm text-ink-muted">A full dump runs automatically every Sunday. Last 12 of each kind are kept.</p>
      <ul className="mt-3 space-y-1">
        {backups?.map((b) => (
          <li key={b.id} className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">
              {b.trigger} — {new Date(b.createdAt).toLocaleString()}
            </span>
            <a href={`/api/export/backups/${b.id}`} className="text-ink underline underline-offset-2">
              Download
            </a>
          </li>
        ))}
        {backups && backups.length === 0 && <li className="text-sm text-ink-muted">None yet.</li>}
      </ul>
    </main>
  );
}
