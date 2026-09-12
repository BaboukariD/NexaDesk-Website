import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

// "One page per topic holding everything needed for it: core
// vocabulary, the grammar points, five model sentences, the question
// forms" (5.8). Model sentences are pulled from real flashcard
// sentences already tied to this topic's vocab — nothing generated
// here, just assembled from what's already been entered.
export async function GET(_req: Request, { params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  const userId = await getUserId();

  const topic = await prisma.topic.findUnique({ where: { slug: topicSlug } });
  if (!topic) return NextResponse.json({ error: "Unknown topic" }, { status: 404 });

  const [vocab, grammarNotes, sentenceCards] = await Promise.all([
    prisma.vocabItem.findMany({ where: { userId, topicId: topic.id } }),
    prisma.grammarNote.findMany({ where: { topicId: topic.id } }),
    prisma.flashcard.findMany({
      where: { vocabItem: { userId, topicId: topic.id }, sentenceAr: { not: null } },
      take: 5,
      include: { vocabItem: true },
    }),
  ]);

  return NextResponse.json({
    topic,
    vocab: vocab.map((v) => ({ arabic: v.arabic, english: v.english, root: v.root })),
    grammarNotes: grammarNotes.map((g) => ({ title: g.title, bodyAr: g.bodyAr, bodyEn: g.bodyEn })),
    modelSentences: sentenceCards.map((c) => ({ ar: c.sentenceAr, en: c.sentenceEn })),
  });
}
