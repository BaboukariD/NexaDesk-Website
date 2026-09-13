"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Topic = { id: number; nameEn: string };
type Item = { id: number; sourceText: string; targetText: string };
type Task = { id: number; direction: string; items: Item[] };

export default function TranslationPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [direction, setDirection] = useState<"en_to_ar" | "ar_to_en">("en_to_ar");
  const [task, setTask] = useState<Task | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ score: number; feedback: string } | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics);
  }, []);

  async function generate() {
    if (!topicId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/translation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: Number(topicId), direction }),
      });
      const data = await res.json();
      if (res.ok) {
        setTask(data);
        setIndex(0);
        setScores([]);
        setFeedback(null);
        setAnswer("");
      } else {
        setError(data.error ?? "Could not generate sentences.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (!task || !answer.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const item = task.items[index];
      const res = await fetch("/api/translation/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, userAnswer: answer }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(data);
        setScores((prev) => [...prev, data.score]);
      } else {
        setError(data.error ?? "Could not mark this translation.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setIndex((i) => i + 1);
    setAnswer("");
    setFeedback(null);
  }

  const item = task?.items[index];
  const done = task && index >= task.items.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
        Home
      </Link>

      {!task && (
        <div className="mt-8 space-y-3">
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink">
            <option value="">Choose a topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameEn}
              </option>
            ))}
          </select>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={direction === "en_to_ar"} onChange={() => setDirection("en_to_ar")} />
              English → Arabic
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={direction === "ar_to_en"} onChange={() => setDirection("ar_to_en")} />
              Arabic → English
            </label>
          </div>
          <button onClick={generate} disabled={!topicId || generating} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
            {generating ? "Generating…" : "Generate 5 sentences"}
          </button>
          {error && <p className="text-sm text-error">{error}</p>}
        </div>
      )}

      {task && !done && item && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-ink-muted">Sentence {index + 1} of {task.items.length}</p>
          <p className={direction === "en_to_ar" ? "mt-4 text-xl text-ink" : "arabic-text mt-4 text-2xl text-ink"} lang={direction === "en_to_ar" ? undefined : "ar"}>
            {item.sourceText}
          </p>

          {!feedback ? (
            <div className="mt-8 w-full">
              <input
                autoFocus
                dir={direction === "en_to_ar" ? "rtl" : "ltr"}
                lang={direction === "en_to_ar" ? "ar" : undefined}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className={(direction === "en_to_ar" ? "arabic-text " : "") + "w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"}
              />
              <button onClick={submit} disabled={submitting || !answer.trim()} className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
                {submitting ? "Marking…" : "Check"}
              </button>
            </div>
          ) : (
            <div className="mt-8 w-full">
              <p className={feedback.score === 2 ? "text-accent" : feedback.score === 1 ? "text-ink" : "text-error"}>
                {feedback.score}/2 — {feedback.feedback}
              </p>
              <button onClick={next} className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-ink">
            {scores.reduce((s, n) => s + n, 0)} / {task.items.length * 2}
          </p>
          <button onClick={() => setTask(null)} className="mt-4 text-sm text-ink-muted underline underline-offset-2">
            New set
          </button>
        </div>
      )}
    </main>
  );
}
