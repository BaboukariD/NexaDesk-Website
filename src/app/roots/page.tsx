"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RootGroup = {
  root: string;
  items: { id: number; arabic: string; english: string }[];
  note: { quranRef: string | null; quranSnippet: string | null } | null;
};

export default function RootsPage() {
  const [groups, setGroups] = useState<RootGroup[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ quranRef: "", quranSnippet: "" });
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ root: string; confident: boolean; quranRef?: string; quranSnippet?: string; note?: string } | null>(null);

  function load() {
    fetch("/api/roots")
      .then((r) => r.json())
      .then(setGroups);
  }

  useEffect(load, []);

  function startEdit(g: RootGroup) {
    setEditing(g.root);
    setSuggestion(null);
    setDraft({ quranRef: g.note?.quranRef ?? "", quranSnippet: g.note?.quranSnippet ?? "" });
  }

  async function save(root: string) {
    await fetch(`/api/roots/${encodeURIComponent(root)}/note`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setEditing(null);
    load();
  }

  async function suggest(root: string) {
    setSuggesting(root);
    try {
      const res = await fetch(`/api/roots/${encodeURIComponent(root)}/suggest`, { method: "POST" });
      const data = await res.json();
      setSuggestion({ root, ...data });
      if (data.confident) {
        setDraft({ quranRef: data.quranRef ?? "", quranSnippet: data.quranSnippet ?? "" });
      }
    } finally {
      setSuggesting(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Roots</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <div className="mt-8 space-y-8">
        {groups?.map((g) => (
          <div key={g.root} className="border-b border-line pb-6">
            <p className="arabic-text text-xl text-ink" lang="ar">
              {g.root}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {g.items.map((item) => (
                <span key={item.id} className="text-sm">
                  <span className="arabic-text text-ink" lang="ar">
                    {item.arabic}
                  </span>{" "}
                  <span className="text-ink-muted">({item.english})</span>
                </span>
              ))}
            </div>

            {editing === g.root ? (
              <div className="mt-3 space-y-2">
                {suggesting === g.root && <p className="text-sm text-ink-muted">Asking…</p>}
                {suggestion?.root === g.root && !suggestion.confident && (
                  <p className="text-sm text-error">Not confident: {suggestion.note ?? "no reference offered."}</p>
                )}
                <input
                  placeholder="Reference, e.g. ٢:٣٢"
                  value={draft.quranRef}
                  onChange={(e) => setDraft({ ...draft, quranRef: e.target.value })}
                  className="w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                />
                <input
                  dir="rtl"
                  lang="ar"
                  placeholder="A few words only"
                  value={draft.quranSnippet}
                  onChange={(e) => setDraft({ ...draft, quranSnippet: e.target.value })}
                  className="arabic-text w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => suggest(g.root)}
                    className="text-sm text-ink-muted underline underline-offset-2"
                  >
                    Suggest (review before saving)
                  </button>
                  <button onClick={() => save(g.root)} className="rounded-md bg-ink px-3 py-1 text-sm text-paper">
                    Save
                  </button>
                  <button onClick={() => setEditing(null)} className="text-sm text-ink-muted">
                    Cancel
                  </button>
                </div>
              </div>
            ) : g.note?.quranRef ? (
              <button onClick={() => startEdit(g)} className="mt-2 block text-start text-sm text-ink-muted">
                <span className="arabic-text" lang="ar">{g.note.quranSnippet}</span> — {g.note.quranRef}
              </button>
            ) : (
              <button
                onClick={() => startEdit(g)}
                className="mt-2 text-sm text-ink-muted underline underline-offset-2"
              >
                Add a Quran anchor
              </button>
            )}
          </div>
        ))}
        {groups && groups.length === 0 && (
          <p className="text-sm text-ink-muted">No roots recorded yet — add a root when entering vocabulary.</p>
        )}
      </div>
    </main>
  );
}
