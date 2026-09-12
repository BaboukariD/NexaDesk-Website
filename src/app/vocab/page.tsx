"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Topic = { id: number; nameAr: string; nameEn: string; order: number };
type VocabItem = {
  id: number;
  arabic: string;
  english: string;
  partOfSpeech: string | null;
  root: string | null;
  gender: string | null;
  plural: string | null;
  notes: string | null;
  topic: Topic | null;
};

const EMPTY_FORM = {
  arabic: "",
  english: "",
  partOfSpeech: "",
  root: "",
  gender: "",
  plural: "",
  notes: "",
  topicId: "",
  sentenceAr: "",
  sentenceEn: "",
};

export default function VocabPage() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSentence, setShowSentence] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const [vocabRes, topicsRes] = await Promise.all([fetch("/api/vocab"), fetch("/api/topics")]);
    setItems(await vocabRes.json());
    setTopics(await topicsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          topicId: form.topicId ? Number(form.topicId) : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
        return;
      }
      setForm(EMPTY_FORM);
      setShowSentence(false);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/vocab/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Vocabulary</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 border-b border-line pb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-muted">Arabic (vowelled)</label>
            <input
              dir="rtl"
              lang="ar"
              required
              value={form.arabic}
              onChange={(e) => setForm({ ...form, arabic: e.target.value })}
              className="arabic-text mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted">English</label>
            <input
              required
              value={form.english}
              onChange={(e) => setForm({ ...form, english: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-ink-muted">Root</label>
            <input
              dir="rtl"
              lang="ar"
              value={form.root}
              onChange={(e) => setForm({ ...form, root: e.target.value })}
              placeholder="د-ر-س"
              className="arabic-text mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted">Part of speech</label>
            <input
              value={form.partOfSpeech}
              onChange={(e) => setForm({ ...form, partOfSpeech: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-muted">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            >
              <option value=""></option>
              <option value="m">m</option>
              <option value="f">f</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink-muted">Plural</label>
            <input
              dir="rtl"
              lang="ar"
              value={form.plural}
              onChange={(e) => setForm({ ...form, plural: e.target.value })}
              className="arabic-text mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-ink-muted">Topic</label>
          <select
            value={form.topicId}
            onChange={(e) => setForm({ ...form, topicId: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
          >
            <option value="">None</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameEn} — {t.nameAr}
              </option>
            ))}
          </select>
        </div>

        {!showSentence ? (
          <button
            type="button"
            onClick={() => setShowSentence(true)}
            className="text-sm text-ink-muted underline underline-offset-2"
          >
            Add an example sentence (recommended — cards from sentences stick better)
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-ink-muted">Example sentence (Arabic)</label>
              <input
                dir="rtl"
                lang="ar"
                value={form.sentenceAr}
                onChange={(e) => setForm({ ...form, sentenceAr: e.target.value })}
                className="arabic-text mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm text-ink-muted">Example sentence (English)</label>
              <input
                value={form.sentenceEn}
                onChange={(e) => setForm({ ...form, sentenceEn: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm text-ink-muted">Notes</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
        >
          Add word
        </button>
      </form>

      <ul className="mt-8 divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-3">
            <div>
              <span className="arabic-text text-lg text-ink" lang="ar">
                {item.arabic}
              </span>
              <span className="ms-3 text-sm text-ink-muted">{item.english}</span>
              {item.topic && (
                <span className="ms-3 rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
                  {item.topic.nameEn}
                </span>
              )}
            </div>
            <button
              onClick={() => handleDelete(item.id)}
              className="text-sm text-ink-muted underline underline-offset-2"
            >
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && <p className="py-6 text-sm text-ink-muted">No vocabulary yet.</p>}
      </ul>
    </main>
  );
}
