import { prisma } from "@/lib/prisma";
import { toSkeleton } from "@/lib/normalize";

// Section B: one query, any input style — مُهَنْدِس, مهندس, engineer,
// muhandis, and mo7andis must all find the same word. toSkeleton
// already normalises tashkeel, أ/إ/آ, ى, ة, and Latin/Franco spelling
// variation for exactly this reason (see normalize.ts) — search reuses
// it rather than inventing a second normalisation scheme that could
// drift out of sync with what the drills actually accept.

export type VocabResult = {
  kind: "vocab";
  id: number;
  arabic: string;
  english: string;
  source: string | null;
  accuracy: number | null;
  dueDate: string | null;
  sticky: boolean;
};

export type LineResult = {
  kind: "line" | "sentence";
  id: number;
  arabic: string;
  english: string;
  context: string;
};

function matches(querySkeletons: string[], candidateSkeleton: string): boolean {
  return querySkeletons.some(
    (qs) => qs.length > 0 && (candidateSkeleton.includes(qs) || qs.includes(candidateSkeleton))
  );
}

/**
 * Search is explicitly asked to be more forgiving than grading:
 * "fuzzy match on transliteration, because he does not spell it
 * consistently." One real gap grading doesn't need to care about:
 * casual Franco-Arabic often uses "7" for a plain ه sound as well as
 * its technically-correct ح (e.g. "mo7andis" for مُهَنْدِس, which has
 * no ح at all) — so search tries the query both ways rather than
 * requiring the technically-correct digit.
 */
function querySkeletonVariants(query: string): string[] {
  const variants = new Set([toSkeleton(query)]);
  if (/7/.test(query)) variants.add(toSkeleton(query.replace(/7/g, "h")));
  return [...variants];
}

export async function search(userId: number, query: string): Promise<{ vocab: VocabResult[]; lines: LineResult[] }> {
  const q = query.trim();
  if (q.length < 2) return { vocab: [], lines: [] };

  const qSkeletons = querySkeletonVariants(q);
  const qLower = q.toLowerCase();

  const [vocabItems, dialogueLines, flashcards, stickyWords, attempts, reviewStates] = await Promise.all([
    prisma.vocabItem.findMany({
      where: { userId },
      include: { lesson: { include: { unit: { include: { book: true } } } } },
    }),
    prisma.dialogueLine.findMany({ include: { dialogue: true } }),
    prisma.flashcard.findMany({ where: { vocabItem: { userId }, sentenceAr: { not: null } }, include: { vocabItem: true } }),
    prisma.stickyWord.findMany({ where: { userId, active: true } }),
    prisma.attempt.findMany({ where: { userId, expectedAnswer: { not: null } }, select: { expectedAnswer: true, correct: true } }),
    prisma.reviewState.findMany({ where: { userId }, include: { flashcard: { include: { vocabItem: true } } } }),
  ]);

  const stickySkeletons = new Set(stickyWords.map((w) => toSkeleton(w.arabic)));

  const accuracyBySkeleton = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    if (!a.expectedAnswer) continue;
    const skel = toSkeleton(a.expectedAnswer);
    const bucket = accuracyBySkeleton.get(skel) ?? { correct: 0, total: 0 };
    bucket.total++;
    if (a.correct) bucket.correct++;
    accuracyBySkeleton.set(skel, bucket);
  }

  // Due dates indexed by the vocab word's own skeleton, via its
  // flashcard's review schedule.
  const dueBySkeleton = new Map<string, Date>();
  for (const rs of reviewStates) {
    dueBySkeleton.set(toSkeleton(rs.flashcard.vocabItem.arabic), rs.due);
  }

  const vocabResults: VocabResult[] = [];
  for (const item of vocabItems) {
    const skel = toSkeleton(item.arabic);
    const englishHit = item.english.toLowerCase().includes(qLower);
    if (!matches(qSkeletons, skel) && !englishHit) continue;

    const acc = accuracyBySkeleton.get(skel);
    const book = item.lesson.unit.book;
    vocabResults.push({
      kind: "vocab",
      id: item.id,
      arabic: item.arabic,
      english: item.english,
      source: item.sourceRef ?? `${book.title}, unit ${item.lesson.unit.number}`,
      accuracy: acc && acc.total > 0 ? acc.correct / acc.total : null,
      dueDate: dueBySkeleton.get(skel)?.toISOString() ?? null,
      sticky: stickySkeletons.has(skel),
    });
  }

  const lineResults: LineResult[] = [];
  for (const line of dialogueLines) {
    const skel = toSkeleton(line.arabic);
    const englishHit = line.english.toLowerCase().includes(qLower);
    if (!matches(qSkeletons, skel) && !englishHit) continue;
    lineResults.push({ kind: "line", id: line.id, arabic: line.arabic, english: line.english, context: line.dialogue.title });
  }
  for (const card of flashcards) {
    if (!card.sentenceAr) continue;
    const skel = toSkeleton(card.sentenceAr);
    const englishHit = (card.sentenceEn ?? "").toLowerCase().includes(qLower);
    if (!matches(qSkeletons, skel) && !englishHit) continue;
    lineResults.push({
      kind: "sentence",
      id: card.id,
      arabic: card.sentenceAr,
      english: card.sentenceEn ?? "",
      context: card.vocabItem.english,
    });
  }

  return { vocab: vocabResults.slice(0, 20), lines: lineResults.slice(0, 20) };
}
