import { prisma } from "@/lib/prisma";

// Section E: once a week, produce everything from the last seven days
// from memory — no book, no hints, no multiple choice. "The last seven
// days" is scoped to whatever was actually drilled or reviewed in
// that window, not the whole vocabulary — this is a recall check on
// recent material, not a general test.

export async function getRecentWords(userId: number, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const attempts = await prisma.attempt.findMany({
    where: { userId, createdAt: { gte: since }, expectedAnswer: { not: null } },
    select: { expectedAnswer: true },
    distinct: ["expectedAnswer"],
  });

  const arabicForms = attempts.map((a) => a.expectedAnswer!).filter((a) => a.length < 40); // skip whole-sentence answers
  const vocabItems = await prisma.vocabItem.findMany({
    where: { userId, arabic: { in: arabicForms } },
  });

  return vocabItems.map((v) => ({ id: v.id, arabic: v.arabic, english: v.english }));
}
