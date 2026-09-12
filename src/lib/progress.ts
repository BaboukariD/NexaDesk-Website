import { prisma } from "@/lib/prisma";

// Deliberately minimal per section 5.7: "words known versus words
// seen, accuracy trend by week, current error patterns, and units
// completed against the book's total." No streaks, no XP.

function startOfWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export async function getWordsKnownVsSeen(userId: number) {
  const [wordsSeen, wordsKnown] = await Promise.all([
    prisma.vocabItem.count({ where: { userId } }),
    prisma.reviewState.count({ where: { userId, state: "Review" } }),
  ]);
  return { wordsSeen, wordsKnown };
}

export async function getWeeklyAccuracy(userId: number, weeks = 8) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - weeks * 7);

  const attempts = await prisma.attempt.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true, correct: true },
  });

  const buckets = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    const key = startOfWeek(a.createdAt).toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { correct: 0, total: 0 };
    bucket.total++;
    if (a.correct) bucket.correct++;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([weekStart, { correct, total }]) => ({ weekStart, accuracy: correct / total, count: total }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export async function getUnitsProgress(userId: number) {
  const books = await prisma.book.findMany({
    where: { title: { not: "Manual additions" } },
    include: {
      units: {
        include: {
          lessons: {
            include: {
              vocabItems: {
                where: { userId },
                include: { flashcards: { include: { reviewStates: true } } },
              },
            },
          },
        },
      },
    },
  });

  return books.map((book) => {
    let completedUnits = 0;
    for (const unit of book.units) {
      const vocabItems = unit.lessons.flatMap((l) => l.vocabItems);
      if (vocabItems.length === 0) continue;
      const allMature = vocabItems.every((v) =>
        v.flashcards.some((f) => f.reviewStates.some((rs) => rs.state === "Review"))
      );
      if (allMature) completedUnits++;
    }
    return { bookTitle: book.title, completedUnits, totalUnits: book.units.length };
  });
}
