"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type DrillItem = {
  token: string;
  type: string;
  direction: string;
  instruction: string;
  promptAr?: string;
  promptEn?: string;
  options?: string[];
};

type Topic = { id: number; nameEn: string; nameAr: string; order: number };

export default function DrillsPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [item, setItem] = useState<DrillItem | null | undefined>(undefined);
  const [answer, setAnswer] = useState("");
  const [built, setBuilt] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ correct: boolean; hintPosition?: number; expected?: string } | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<string>("");
  const shownAt = useRef<number>(Date.now());

  const loadNext = useCallback(async (sid: number, topic: string) => {
    setFeedback(null);
    setExplanation(null);
    setAnswer("");
    setBuilt([]);
    const qs = topic ? `?sessionId=${sid}&topicId=${topic}` : `?sessionId=${sid}`;
    const res = await fetch(`/api/drill/next${qs}`);
    const data = await res.json();
    setItem(data.item);
    setRemaining(data.item?.options ? [...data.item.options] : []);
    shownAt.current = Date.now();
  }, []);

  useEffect(() => {
    fetch("/api/topics")
      .then((r) => r.json())
      .then(setTopics);
    fetch("/api/drill/session", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        setSessionId(data.sessionId);
        loadNext(data.sessionId, "");
      });
  }, [loadNext]);

  async function submit(rawAnswer: string) {
    if (!item || !sessionId) return;
    const res = await fetch("/api/drill/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        token: item.token,
        answer: rawAnswer,
        responseMs: Date.now() - shownAt.current,
      }),
    });
    const data = await res.json();
    setFeedback(data);
  }

  async function reveal() {
    if (!item) return;
    const res = await fetch("/api/drill/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: item.token, answer: "", reveal: true }),
    });
    const data = await res.json();
    setFeedback((prev) => ({ ...(prev ?? { correct: false }), expected: data.expected }));
  }

  async function explainNow() {
    if (!feedback?.expected) return;
    setExplaining(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedArabic: feedback.expected, userAnswer: answer, englishGloss: item?.promptEn }),
      });
      const data = await res.json();
      setExplanation(data.explanation ?? "No specific pattern recognised for this one.");
    } finally {
      setExplaining(false);
    }
  }

  function addWord(word: string, idx: number) {
    setBuilt([...built, word]);
    setRemaining(remaining.filter((_, i) => i !== idx));
  }

  function clearBuilt() {
    if (!item?.options) return;
    setBuilt([]);
    setRemaining([...item.options]);
  }

  if (item === undefined) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
        <select
          value={topicId}
          onChange={(e) => {
            setTopicId(e.target.value);
            if (sessionId) loadNext(sessionId, e.target.value);
          }}
          className="rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink-muted"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {item === null ? (
          <p className="text-ink-muted">Nothing to drill yet — add some vocabulary first.</p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">{item.instruction}</p>

            {item.promptEn && <p className="mt-4 text-xl text-ink">{item.promptEn}</p>}
            {item.promptAr && (
              <p className="arabic-text mt-4 text-2xl text-ink" lang="ar">
                {item.promptAr}
              </p>
            )}

            {(item.type === "translate_to_ar" || item.type === "fill_gap" || item.type === "possessive_suffix_gen" || item.type === "verb_prefix_gen" || item.type === "gender_agreement" || item.type === "cloze") && !feedback && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(answer);
                }}
                className="mt-8 w-full"
              >
                <input
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Arabic, transliteration, or Franco-Arabic"
                  className="arabic-text w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"
                />
                <button type="submit" className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
                  Check
                </button>
              </form>
            )}

            {item.type === "translate_to_en" && !feedback && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(answer);
                }}
                className="mt-8 w-full"
              >
                <input
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full rounded-md border border-line bg-paper px-3 py-2 text-lg text-ink outline-none focus:border-accent"
                />
                <button type="submit" className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
                  Check
                </button>
              </form>
            )}

            {item.type === "scrambled_sentence" && !feedback && (
              <div className="mt-8 w-full">
                <div className="arabic-text flex min-h-[3rem] flex-wrap justify-center gap-2 rounded-md border border-line p-3 text-lg" lang="ar">
                  {built.map((w, i) => (
                    <span key={i}>{w}</span>
                  ))}
                </div>
                <div className="arabic-text mt-4 flex flex-wrap justify-center gap-2" lang="ar">
                  {remaining.map((w, i) => (
                    <button
                      key={i}
                      onClick={() => addWord(w, i)}
                      className="rounded-md border border-line px-3 py-1 text-lg text-ink"
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={clearBuilt} className="text-sm text-ink-muted underline underline-offset-2">
                    Clear
                  </button>
                  <button
                    onClick={() => submit(built.join(" "))}
                    disabled={built.length === 0}
                    className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
                  >
                    Check
                  </button>
                </div>
              </div>
            )}

            {(item.type === "true_false" || item.type === "maa_or_min" || item.type === "possessive_suffix" || item.type === "interference_pair") &&
              !feedback && (
                <div className="mt-8 flex justify-center gap-3">
                  {(item.options ?? []).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => submit(opt)}
                      className="rounded-md border border-line px-4 py-2 text-sm text-ink"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

            {feedback && (
              <div className="mt-8 w-full">
                {feedback.correct ? (
                  <p className="text-accent">Correct.</p>
                ) : (
                  <>
                    <p className="text-error">
                      Not quite.
                      {feedback.hintPosition && ` Check word/letter position ${feedback.hintPosition}.`}
                    </p>
                    {feedback.expected && (
                      <>
                        <p className="arabic-text mt-2 text-lg text-ink" lang="ar">
                          {feedback.expected}
                        </p>
                        {!explanation ? (
                          <button
                            onClick={explainNow}
                            disabled={explaining}
                            className="mt-2 text-sm text-ink-muted underline underline-offset-2"
                          >
                            {explaining ? "…" : "Why was this wrong?"}
                          </button>
                        ) : (
                          <p className="mt-2 text-sm text-ink">{explanation}</p>
                        )}
                      </>
                    )}
                  </>
                )}

                <div className="mt-4 flex justify-center gap-3">
                  {!feedback.correct && !feedback.expected && (
                    <>
                      <button
                        onClick={() => setFeedback(null)}
                        className="rounded-md border border-line px-4 py-2 text-sm text-ink"
                      >
                        Retry
                      </button>
                      <button onClick={reveal} className="text-sm text-ink-muted underline underline-offset-2">
                        Show answer
                      </button>
                    </>
                  )}
                  {(feedback.correct || feedback.expected) && (
                    <button
                      onClick={() => sessionId && loadNext(sessionId, topicId)}
                      className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
