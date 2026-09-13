import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

// Section I. Deliberately separate from the pattern-based Weaknesses
// view — this is individual words with a poor hit rate, not confusion
// patterns. Entry and exit are asymmetric on purpose: entry is fast
// (one bad run flags it), exit is slow and spans real time (three
// separate days), because a word that's merely convenient to recall
// in one cramming session isn't the same as a word that's actually
// stuck.

export type SkillCategory = "reading" | "listening" | "production";

const ENTRY_WINDOW = 5;
const ENTRY_ACCURACY_THRESHOLD = 0.6;
const EXIT_DISTINCT_DAYS = 3;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Maps a drill's shape to which of the three failure modes it tests —
 * "the same word can be solid on the page and invisible when heard."
 */
export function skillCategoryForDrillType(drillType: string): SkillCategory {
  if (drillType === "translate_to_en") return "reading";
  if (drillType === "true_false") return "listening";
  return "production";
}

export async function recordAttemptForStickyWords(
  db: Db,
  userId: number,
  arabic: string,
  gloss: string,
  correct: boolean,
  userAnswer: string,
  category: SkillCategory
): Promise<void> {
  const existing = await db.stickyWord.findUnique({ where: { userId_arabic: { userId, arabic } } });

  const skillBreakdown = existing
    ? JSON.parse(existing.skillBreakdown)
    : { reading: { seen: 0, wrong: 0 }, listening: { seen: 0, wrong: 0 }, production: { seen: 0, wrong: 0 } };
  skillBreakdown[category].seen += 1;
  if (!correct) skillBreakdown[category].wrong += 1;

  let lastWrongAnswers: string[] = existing ? JSON.parse(existing.lastWrongAnswers) : [];
  if (!correct) lastWrongAnswers = [...lastWrongAnswers, userAnswer].slice(-3);

  let correctDays: string[] = existing ? JSON.parse(existing.correctDays) : [];
  let active = existing?.active ?? false;
  let graduatedAt = existing?.graduatedAt ?? null;

  const timesSeen = (existing?.timesSeen ?? 0) + 1;
  const timesWrong = (existing?.timesWrong ?? 0) + (correct ? 0 : 1);

  // Recent window for the entry check.
  const recentAttempts = await db.attempt.findMany({
    where: { userId, expectedAnswer: arabic },
    orderBy: { createdAt: "desc" },
    take: ENTRY_WINDOW,
  });

  if (!active) {
    const twoWrongInARow = recentAttempts.length >= 2 && !recentAttempts[0].correct && !recentAttempts[1].correct;
    const windowAccuracy =
      recentAttempts.length >= ENTRY_WINDOW
        ? recentAttempts.filter((a) => a.correct).length / recentAttempts.length
        : 1;
    if (twoWrongInARow || windowAccuracy < ENTRY_ACCURACY_THRESHOLD) {
      active = true;
      correctDays = []; // fresh start once flagged
    }
  } else if (correct) {
    const day = today();
    if (!correctDays.includes(day)) correctDays = [...correctDays, day];
    if (correctDays.length >= EXIT_DISTINCT_DAYS) {
      active = false;
      graduatedAt = new Date();
      correctDays = [];
    }
  }

  await db.stickyWord.upsert({
    where: { userId_arabic: { userId, arabic } },
    update: {
      gloss,
      timesSeen,
      timesWrong,
      lastWrongAnswers: JSON.stringify(lastWrongAnswers),
      skillBreakdown: JSON.stringify(skillBreakdown),
      correctDays: JSON.stringify(correctDays),
      active,
      graduatedAt,
    },
    create: {
      userId,
      arabic,
      gloss,
      timesSeen: 1,
      timesWrong: correct ? 0 : 1,
      lastWrongAnswers: JSON.stringify(lastWrongAnswers),
      skillBreakdown: JSON.stringify(skillBreakdown),
      correctDays: JSON.stringify(correctDays),
      active,
    },
  });
}
