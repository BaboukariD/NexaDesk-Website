"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Topic = { id: number; nameEn: string; nameAr: string };
type Task = { id: number; type: string; prompt: string; wordCountTarget: number | null; rolePlayPrompts: string | null };
type MarkedAttempt = {
  contentScore: number;
  accuracyScore: number;
  rangeScore: number;
  feedback: string;
  modelAnswer: string;
  responseText: string;
};

const TYPE_LABELS: Record<string, string> = {
  writing: "Writing",
  speaking_roleplay: "Speaking — role play",
  speaking_photocard: "Speaking — photo card",
  speaking_conversation: "Speaking — general conversation",
};

const CRITERIA = [
  { key: "contentScore", label: "Content", note: "did he cover all the required points" },
  { key: "accuracyScore", label: "Accuracy", note: "verb prefixes, gender agreement, possessive suffixes, case endings" },
  { key: "rangeScore", label: "Range", note: "variety of vocabulary and structures beyond the minimum" },
] as const;

export default function AssessmentPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [type, setType] = useState("writing");
  const [task, setTask] = useState<Task | null>(null);
  const [generating, setGenerating] = useState(false);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MarkedAttempt | null>(null);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics);
  }, []);

  async function generate() {
    if (!topicId) return;
    setGenerating(true);
    setTask(null);
    setResult(null);
    setResponse("");
    try {
      const res = await fetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: Number(topicId), type }),
      });
      const data = await res.json();
      if (res.ok) setTask(data);
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (!task || !response.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/assessment/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, responseText: response }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  const rolePlayPrompts: string[] = task?.rolePlayPrompts ? JSON.parse(task.rolePlayPrompts) : [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Assessment</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Speaking tasks are typed, not spoken — a substitute for real speaking practice, not a replacement for it.
      </p>

      {!task && (
        <div className="mt-8 space-y-3">
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
          >
            <option value="">Choose a topic…</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameEn}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={!topicId || generating}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            {generating ? "Generating…" : "Generate a task"}
          </button>
        </div>
      )}

      {task && !result && (
        <div className="mt-8">
          <p className="text-sm font-medium text-ink">{TYPE_LABELS[task.type]}</p>
          <p className="mt-2 text-ink">{task.prompt}</p>
          {task.wordCountTarget && <p className="mt-1 text-sm text-ink-muted">Target: ~{task.wordCountTarget} words</p>}
          {rolePlayPrompts.length > 0 && (
            <ol className="mt-2 list-inside list-decimal text-sm text-ink">
              {rolePlayPrompts.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          )}

          <div className="mt-6 rounded-md border border-line p-3">
            <p className="text-xs uppercase text-ink-muted">Mark scheme (out of 5 each)</p>
            <ul className="mt-2 space-y-1">
              {CRITERIA.map((c) => (
                <li key={c.key} className="text-sm">
                  <span className="text-ink">{c.label}</span> <span className="text-ink-muted">— {c.note}</span>
                </li>
              ))}
            </ul>
          </div>

          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            dir="rtl"
            lang="ar"
            rows={6}
            className="arabic-text mt-4 w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"
            placeholder="اكتب هنا"
          />
          <button
            onClick={submit}
            disabled={submitting || !response.trim()}
            className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            {submitting ? "Marking…" : "Submit"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="grid grid-cols-3 gap-3">
            {CRITERIA.map((c) => (
              <div key={c.key} className="rounded-md border border-line p-3 text-center">
                <p className="text-xs uppercase text-ink-muted">{c.label}</p>
                <p className="mt-1 text-xl text-ink">{result[c.key]}/5</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-ink">{result.feedback}</p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-ink-muted">Your answer</p>
              <p className="arabic-text mt-1 text-ink" lang="ar">
                {result.responseText}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-muted">Model answer</p>
              <p className="arabic-text mt-1 text-ink" lang="ar">
                {result.modelAnswer}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setTask(null);
              setResult(null);
            }}
            className="mt-6 text-sm text-ink-muted underline underline-offset-2"
          >
            New task
          </button>
        </div>
      )}
    </main>
  );
}
