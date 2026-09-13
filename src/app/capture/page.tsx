"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CaptureItem = { id: number; arabic: string; status: string };

const QUEUE_KEY = "arabic-app-capture-queue";

function readQueue(): string[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: string[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // private browsing or storage disabled — capture still works online, just can't queue offline
  }
}

export default function CapturePage() {
  const [arabic, setArabic] = useState("");
  const [items, setItems] = useState<CaptureItem[] | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [glossing, setGlossing] = useState<number | null>(null);
  const [manualGloss, setManualGloss] = useState<Record<number, string>>({});
  const [processError, setProcessError] = useState<Record<number, string>>({});

  function loadItems() {
    fetch("/api/capture")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {});
  }

  async function flushQueue() {
    const queue = readQueue();
    if (queue.length === 0) return;
    const remaining: string[] = [];
    for (const word of queue) {
      try {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ arabic: word }),
        });
        if (!res.ok) remaining.push(word);
      } catch {
        remaining.push(word);
      }
    }
    writeQueue(remaining);
    setQueuedCount(remaining.length);
    loadItems();
  }

  useEffect(() => {
    setQueuedCount(readQueue().length);
    loadItems();
    flushQueue();
    window.addEventListener("online", flushQueue);
    return () => window.removeEventListener("online", flushQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!arabic.trim()) return;
    const word = arabic.trim();
    setArabic("");

    if (!navigator.onLine) {
      const queue = [...readQueue(), word];
      writeQueue(queue);
      setQueuedCount(queue.length);
      return;
    }

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arabic: word }),
      });
      if (res.ok) loadItems();
      else {
        const queue = [...readQueue(), word];
        writeQueue(queue);
        setQueuedCount(queue.length);
      }
    } catch {
      const queue = [...readQueue(), word];
      writeQueue(queue);
      setQueuedCount(queue.length);
    }
  }

  async function process(id: number) {
    setGlossing(id);
    setProcessError((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/capture/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ english: manualGloss[id] || undefined }),
      });
      if (res.ok) {
        loadItems();
      } else {
        const data = await res.json().catch(() => ({}));
        setProcessError((prev) => ({
          ...prev,
          [id]: data.error || "Couldn't add this word — type a gloss yourself and try again.",
        }));
      }
    } catch {
      setProcessError((prev) => ({ ...prev, [id]: "Couldn't reach the server — check your connection." }));
    } finally {
      setGlossing(null);
    }
  }

  async function discard(id: number) {
    await fetch(`/api/capture/${id}`, { method: "DELETE" });
    loadItems();
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Quick capture</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">Arabic in, nothing else required. Works offline.</p>

      <form onSubmit={submit} className="mt-6">
        <input
          autoFocus
          dir="rtl"
          lang="ar"
          value={arabic}
          onChange={(e) => setArabic(e.target.value)}
          className="arabic-text w-full rounded-md border border-line bg-paper px-3 py-3 text-2xl text-ink outline-none focus:border-accent"
        />
        <button type="submit" className="mt-3 w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper">
          Capture
        </button>
      </form>

      {queuedCount > 0 && (
        <p className="mt-3 text-sm text-ink-muted">{queuedCount} queued offline — will sync when back online.</p>
      )}

      <h2 className="mt-10 text-sm font-medium uppercase text-ink-muted">Inbox</h2>
      <ul className="mt-2 divide-y divide-line">
        {items?.map((item) => (
          <li key={item.id} className="py-3">
            <p className="arabic-text text-lg text-ink" lang="ar">
              {item.arabic}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <input
                placeholder="Gloss (leave blank to auto-gloss)"
                value={manualGloss[item.id] ?? ""}
                onChange={(e) => setManualGloss({ ...manualGloss, [item.id]: e.target.value })}
                className="flex-1 rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
              />
              <button
                onClick={() => process(item.id)}
                disabled={glossing === item.id}
                className="rounded-md bg-ink px-3 py-1 text-sm text-paper disabled:opacity-40"
              >
                {glossing === item.id ? "…" : "Add"}
              </button>
              <button onClick={() => discard(item.id)} className="text-sm text-ink-muted underline underline-offset-2">
                Discard
              </button>
            </div>
            {processError[item.id] && <p className="mt-1 text-sm text-red-700">{processError[item.id]}</p>}
          </li>
        ))}
        {items && items.length === 0 && <p className="py-3 text-sm text-ink-muted">Nothing pending.</p>}
      </ul>
    </main>
  );
}
