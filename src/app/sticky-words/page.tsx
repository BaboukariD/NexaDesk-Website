"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type StickyWord = {
  id: number;
  arabic: string;
  gloss: string | null;
  timesSeen: number;
  timesWrong: number;
  lastWrongAnswers: string[];
  hitRate: number;
};

export default function StickyWordsPage() {
  const [words, setWords] = useState<StickyWord[] | null>(null);
  const [quiz, setQuiz] = useState<StickyWord[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; hintPosition?: number; expected?: string } | null>(null);
  const shownAt = useRef<number>(Date.now());

  useEffect(() => {
    fetch("/api/sticky-words").then((r) => r.json()).then(setWords);
  }, []);

  function startQuiz() {
    if (!words) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuiz(shuffled);
    setIndex(0);
    setAnswer("");
    setFeedback(null);
    shownAt.current = Date.now();
  }

  async function submit() {
    if (!quiz) return;
    const word = quiz[index];
    const res = await fetch("/api/sticky-words/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: word.id, answer, responseMs: Date.now() - shownAt.current }),
    });
    setFeedback(await res.json());
  }

  async function reveal() {
    if (!quiz) return;
    const word = quiz[index];
    const res = await fetch("/api/sticky-words/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: word.id, reveal: true }),
    });
    setFeedback(await res.json());
  }

  function next() {
    setIndex((i) => i + 1);
    setAnswer("");
    setFeedback(null);
    shownAt.current = Date.now();
  }

  if (quiz && index < quiz.length) {
    const word = quiz[index];
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
        <Link href="/sticky-words" onClick={() => setQuiz(null)} className="text-sm text-ink-muted underline underline-offset-2">
          Stop
        </Link>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-ink-muted">
            {index + 1} of {quiz.length}
          </p>
          <p className="mt-4 text-xl text-ink">{word.gloss}</p>

          {!feedback ? (
            <div className="mt-8 w-full">
              <input
                autoFocus
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="arabic-text w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"
              />
              <button onClick={submit} className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
                Check
              </button>
            </div>
          ) : (
            <div className="mt-8 w-full">
              {feedback.correct ? (
                <p className="text-accent">Correct.</p>
              ) : (
                <p className="text-error">
                  Not quite.{feedback.hintPosition && ` Check position ${feedback.hintPosition}.`}
                </p>
              )}
              {feedback.expected && (
                <p className="arabic-text mt-2 text-lg text-ink" lang="ar">
                  {feedback.expected}
                </p>
              )}
              <div className="mt-4 flex justify-center gap-3">
                {!feedback.correct && !feedback.expected && (
                  <button onClick={reveal} className="text-sm text-ink-muted underline underline-offset-2">
                    Show answer
                  </button>
                )}
                <button onClick={next} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
                  {index + 1 === quiz.length ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Sticky words</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      {words && words.length > 0 && (
        <button onClick={startQuiz} className="mt-6 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
          Drill only these (10 questions)
        </button>
      )}

      <ul className="mt-8 space-y-4">
        {words?.map((w) => (
          <li key={w.id} className="border-b border-line pb-3">
            <div className="flex items-baseline justify-between">
              <span className="arabic-text text-lg text-ink" lang="ar">
                {w.arabic}
              </span>
              <span className="text-sm text-ink-muted">{w.gloss}</span>
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              seen {w.timesSeen}, wrong {w.timesWrong}
              {w.lastWrongAnswers.length > 0 && ` — last tried: ${w.lastWrongAnswers.join(", ")}`}
            </p>
          </li>
        ))}
        {words && words.length === 0 && <p className="text-sm text-ink-muted">Nothing sticky right now.</p>}
      </ul>
    </main>
  );
}
