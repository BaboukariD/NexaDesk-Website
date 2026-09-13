"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Word = { id: number; arabic: string; english: string };
type Result = { word: Word; correct: boolean; expected: string };

// Section E: no book, no hints, no multiple choice. Deliberately all
// at once, deliberately hard — this is the one screen in the app that
// doesn't soften a wrong answer at all.
export default function ColdRecallPage() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const shownAt = useRef<number>(Date.now());

  useEffect(() => {
    fetch("/api/cold-recall")
      .then((r) => r.json())
      .then((data) => {
        setWords(data);
        shownAt.current = Date.now();
      });
  }, []);

  async function submit() {
    if (!words) return;
    const word = words[index];
    const res = await fetch("/api/cold-recall/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vocabId: word.id, answer, responseMs: Date.now() - shownAt.current }),
    });
    const data = await res.json();
    setResults((prev) => [...prev, { word, correct: data.correct, expected: data.expected }]);
    setIndex((i) => i + 1);
    setAnswer("");
    shownAt.current = Date.now();
  }

  if (!words) return null;

  if (words.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-ink-muted">Nothing drilled in the last 7 days to recall.</p>
        <Link href="/" className="mt-4 text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </main>
    );
  }

  if (index >= words.length) {
    const missed = results.filter((r) => !r.correct);
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="text-lg font-medium text-ink">
          {results.length - missed.length} / {results.length}
        </h1>
        {missed.length > 0 && (
          <>
            <p className="mt-4 text-sm text-ink-muted">Couldn't recall — added to sticky words for next week:</p>
            <ul className="mt-2 space-y-1">
              {missed.map((r, i) => (
                <li key={i} className="text-sm">
                  <span className="arabic-text text-ink" lang="ar">{r.expected}</span>{" "}
                  <span className="text-ink-muted">({r.word.english})</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link href="/" className="mt-6 inline-block text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </main>
    );
  }

  const word = words[index];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <p className="text-sm text-ink-muted">
        {index + 1} of {words.length}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="text-xl text-ink">{word.english}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-8 w-full"
        >
          <input
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="arabic-text w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"
          />
          <button type="submit" className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
            {index + 1 === words.length ? "Finish" : "Next"}
          </button>
        </form>
      </div>
    </main>
  );
}
