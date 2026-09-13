import { prisma } from "@/lib/prisma";

// Section O: "a word answered correctly in twelve seconds is not
// known; a word answered in two is." Correct-but-slow answers are the
// ones about to become wrong — surfaced separately from outright
// mistakes, which the Weaknesses/Sticky-words views already cover.

const SLOW_THRESHOLD_MS = 8000;
const MIN_SAMPLES = 2;

export async function getSlowButCorrectItems(userId: number, limit = 5) {
  const attempts = await prisma.attempt.findMany({
    where: { userId, correct: true, expectedAnswer: { not: null } },
    select: { expectedAnswer: true, responseMs: true },
  });

  const byWord = new Map<string, number[]>();
  for (const a of attempts) {
    if (!a.expectedAnswer) continue;
    const list = byWord.get(a.expectedAnswer) ?? [];
    list.push(a.responseMs);
    byWord.set(a.expectedAnswer, list);
  }

  const slow = [...byWord.entries()]
    .filter(([, times]) => times.length >= MIN_SAMPLES)
    .map(([arabic, times]) => ({
      arabic,
      avgResponseMs: Math.round(times.reduce((s, n) => s + n, 0) / times.length),
      samples: times.length,
    }))
    .filter((x) => x.avgResponseMs > SLOW_THRESHOLD_MS)
    .sort((a, b) => b.avgResponseMs - a.avgResponseMs)
    .slice(0, limit);

  return slow;
}
