import { prisma } from "@/lib/prisma";
import { toSkeleton, skeletonsMatch } from "@/lib/normalize";

/**
 * Section K: "auto-generate new pairs whenever two words in his
 * history get swapped for each other more than twice." Called after
 * every wrong translate_to_ar/translate_to_en attempt — if the wrong
 * answer he gave matches a DIFFERENT vocab item's arabic (not the one
 * that was actually asked), that's a swap between the two.
 */
export async function recordPossibleSwap(userId: number, expectedArabic: string, userAnswerSkeleton: string): Promise<void> {
  const allVocab = await prisma.vocabItem.findMany({ where: { userId } });
  const expectedItem = allVocab.find((v) => skeletonsMatch(toSkeleton(v.arabic), toSkeleton(expectedArabic)));
  if (!expectedItem) return;

  const confusedWith = allVocab.find(
    (v) => v.id !== expectedItem.id && skeletonsMatch(toSkeleton(v.arabic), userAnswerSkeleton)
  );
  if (!confusedWith) return;

  const [wordAId, wordBId] = [expectedItem.id, confusedWith.id].sort((a, b) => a - b);

  const existing = await prisma.interferencePair.findUnique({
    where: { userId_wordAId_wordBId: { userId, wordAId, wordBId } },
  });

  if (existing) {
    await prisma.interferencePair.update({
      where: { id: existing.id },
      data: { swapCount: existing.swapCount + 1, lastSeen: new Date() },
    });
  } else {
    await prisma.interferencePair.create({ data: { userId, wordAId, wordBId, swapCount: 1 } });
  }
}

const AUTO_GENERATE_THRESHOLD = 2; // "more than twice" -> generate once count exceeds this

export async function getActiveInterferencePairs(userId: number) {
  return prisma.interferencePair.findMany({
    where: { userId, swapCount: { gt: AUTO_GENERATE_THRESHOLD } },
    include: { wordA: true, wordB: true },
  });
}
