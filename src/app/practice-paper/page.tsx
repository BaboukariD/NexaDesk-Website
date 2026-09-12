"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Topic = { id: number; nameEn: string };
type Paper = {
  id: number;
  listeningTranscriptAr: string;
  listeningTranscriptEn: string;
  listeningQuestions: string;
  readingPassageAr: string;
  readingPassageEn: string;
  readingQuestions: string;
  writingTask: { prompt: string; wordCountTarget: number | null };
  translationTask: { items: { id: number; sourceText: string }[] };
};
type QA = { question: string; answer: string };
type Result = { listeningScorePct: number; readingScorePct: number; writingContentScore: number; writingAccuracyScore: number; writingRangeScore: number; translationScorePct: number; overallPct: number };

export default function PracticePaperPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [listeningAnswers, setListeningAnswers] = useState<string[]>([]);
  const [readingAnswers, setReadingAnswers] = useState<string[]>([]);
  const [translationAnswers, setTranslationAnswers] = useState<string[]>([]);
  const [writingResponse, setWritingResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const startedAt = useRef<number>(0);

  useEffect(() => {
    fetch("/api/topics").then((r) => r.json()).then(setTopics);
  }, []);

  async function generate() {
    if (!topicId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/practice-paper/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: Number(topicId) }),
      });
      const data = await res.json();
      if (res.ok) {
        setPaper(data);
        startedAt.current = Date.now();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function submit() {
    if (!paper) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/practice-paper/${paper.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listeningAnswers,
          readingAnswers,
          translationAnswers,
          writingResponseText: writingResponse,
          durationSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-lg font-medium text-ink">Result</h1>
        <ul className="mt-6 space-y-2 text-sm">
          <li className="flex justify-between"><span className="text-ink-muted">Listening</span><span className="text-ink">{Math.round(result.listeningScorePct)}%</span></li>
          <li className="flex justify-between"><span className="text-ink-muted">Reading</span><span className="text-ink">{Math.round(result.readingScorePct)}%</span></li>
          <li className="flex justify-between"><span className="text-ink-muted">Writing</span><span className="text-ink">{result.writingContentScore}+{result.writingAccuracyScore}+{result.writingRangeScore} / 15</span></li>
          <li className="flex justify-between"><span className="text-ink-muted">Translation</span><span className="text-ink">{Math.round(result.translationScorePct)}%</span></li>
          <li className="flex justify-between border-t border-line pt-2"><span className="text-ink">Overall</span><span className="text-ink">{Math.round(result.overallPct)}%</span></li>
        </ul>
        <Link href="/practice-paper" onClick={() => location.reload()} className="mt-6 inline-block text-sm text-ink-muted underline underline-offset-2">
          New paper
        </Link>
      </main>
    );
  }

  if (!paper) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-medium text-ink">Practice paper</h1>
          <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">Home</Link>
        </div>
        <p className="mt-1 text-sm text-ink-muted">Once per completed topic, not a daily habit — this sits on top of practice, not in place of it.</p>
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="mt-6 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink">
          <option value="">Choose a topic…</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.nameEn}</option>
          ))}
        </select>
        <button onClick={generate} disabled={!topicId || generating} className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
          {generating ? "Generating…" : "Generate paper"}
        </button>
      </main>
    );
  }

  const listeningQ: QA[] = JSON.parse(paper.listeningQuestions);
  const readingQ: QA[] = JSON.parse(paper.readingQuestions);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-lg font-medium text-ink">Practice paper</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Listening (read as text — no audio)</h2>
        <p className="arabic-text mt-2 text-ink" lang="ar">{paper.listeningTranscriptAr}</p>
        <p className="mt-1 text-sm text-ink-muted">{paper.listeningTranscriptEn}</p>
        {listeningQ.map((q, i) => (
          <div key={i} className="mt-3">
            <p className="text-sm text-ink">{q.question}</p>
            <input
              value={listeningAnswers[i] ?? ""}
              onChange={(e) => setListeningAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
              className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
            />
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Reading</h2>
        <p className="arabic-text mt-2 text-ink" lang="ar">{paper.readingPassageAr}</p>
        <p className="mt-1 text-sm text-ink-muted">{paper.readingPassageEn}</p>
        {readingQ.map((q, i) => (
          <div key={i} className="mt-3">
            <p className="text-sm text-ink">{q.question}</p>
            <input
              value={readingAnswers[i] ?? ""}
              onChange={(e) => setReadingAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
              className="mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
            />
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Translation (English → Arabic)</h2>
        {paper.translationTask.items.map((item, i) => (
          <div key={item.id} className="mt-3">
            <p className="text-sm text-ink">{item.sourceText}</p>
            <input
              dir="rtl"
              lang="ar"
              value={translationAnswers[i] ?? ""}
              onChange={(e) => setTranslationAnswers((prev) => { const next = [...prev]; next[i] = e.target.value; return next; })}
              className="arabic-text mt-1 w-full rounded-md border border-line bg-paper px-2 py-1 text-ink"
            />
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase text-ink-muted">Writing</h2>
        <p className="mt-2 text-ink">{paper.writingTask.prompt}</p>
        {paper.writingTask.wordCountTarget && <p className="text-sm text-ink-muted">Target: ~{paper.writingTask.wordCountTarget} words</p>}
        <textarea
          dir="rtl"
          lang="ar"
          rows={6}
          value={writingResponse}
          onChange={(e) => setWritingResponse(e.target.value)}
          className="arabic-text mt-2 w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink"
        />
      </section>

      <button onClick={submit} disabled={submitting} className="mt-8 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40">
        {submitting ? "Marking…" : "Submit paper"}
      </button>
    </main>
  );
}
