"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type ReviewCard = {
  id: number;
  flashcard: {
    sentenceAr: string | null;
    sentenceEn: string | null;
    vocabItem: {
      arabic: string;
      english: string;
      topic: { nameEn: string } | null;
    };
  };
};

const RATINGS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: "Again" },
  { value: 2, label: "Hard" },
  { value: 3, label: "Good" },
  { value: 4, label: "Easy" },
];

export default function FlashcardsPage() {
  const [card, setCard] = useState<ReviewCard | null | undefined>(undefined);
  const [revealed, setRevealed] = useState(false);
  const shownAt = useRef<number>(Date.now());

  const loadNext = useCallback(async () => {
    setRevealed(false);
    const res = await fetch("/api/review/next");
    const data = await res.json();
    setCard(data.reviewState);
    shownAt.current = Date.now();
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  async function handleGrade(rating: 1 | 2 | 3 | 4) {
    if (!card) return;
    await fetch(`/api/review/${card.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, responseMs: Date.now() - shownAt.current }),
    });
    loadNext();
  }

  if (card === undefined) {
    return null; // avoid a flash of empty state while loading
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-12">
      <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
        Home
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {card === null ? (
          <p className="text-ink-muted">Nothing due right now.</p>
        ) : (
          <>
            <p className="arabic-text text-3xl text-ink" lang="ar">
              {card.flashcard.sentenceAr || card.flashcard.vocabItem.arabic}
            </p>

            {!revealed ? (
              <button
                onClick={() => setRevealed(true)}
                className="mt-10 rounded-md border border-line px-4 py-2 text-sm text-ink-muted"
              >
                Show meaning
              </button>
            ) : (
              <>
                <p className="mt-6 text-ink">
                  {card.flashcard.sentenceEn || card.flashcard.vocabItem.english}
                </p>
                {card.flashcard.sentenceAr && (
                  <p className="mt-1 text-sm text-ink-muted">{card.flashcard.vocabItem.arabic}</p>
                )}

                <div className="mt-10 grid grid-cols-4 gap-2">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => handleGrade(r.value)}
                      className={
                        "rounded-md border px-3 py-2 text-sm " +
                        (r.value >= 3
                          ? "border-accent text-accent"
                          : "border-error text-error")
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
