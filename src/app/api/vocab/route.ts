import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { getManualLessonId } from "@/lib/manual-lesson";
import { emptyReviewStateFields } from "@/lib/srs";

export async function GET() {
  const userId = await getUserId();
  const items = await prisma.vocabItem.findMany({
    where: { userId },
    include: { topic: true, flashcards: true },
    orderBy: { id: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.arabic !== "string" || typeof body.english !== "string") {
    return NextResponse.json({ error: "arabic and english are required" }, { status: 400 });
  }

  const arabic = body.arabic.trim();
  const english = body.english.trim();
  if (!arabic || !english) {
    return NextResponse.json({ error: "arabic and english cannot be empty" }, { status: 400 });
  }

  const userId = await getUserId();
  const lessonId = await getManualLessonId();

  const sentenceAr = typeof body.sentenceAr === "string" ? body.sentenceAr.trim() || null : null;
  const sentenceEn = typeof body.sentenceEn === "string" ? body.sentenceEn.trim() || null : null;

  const vocabItem = await prisma.vocabItem.create({
    data: {
      lessonId,
      userId,
      topicId: typeof body.topicId === "number" ? body.topicId : null,
      arabic,
      english,
      partOfSpeech: body.partOfSpeech || null,
      root: body.root || null,
      gender: body.gender || null,
      plural: body.plural || null,
      notes: body.notes || null,
    },
  });

  // A flashcard (and its review schedule) is created immediately —
  // "cards are created automatically from lesson vocabulary" applies
  // to manual entries too, since this IS the lesson for them.
  const flashcard = await prisma.flashcard.create({
    data: { vocabId: vocabItem.id, sentenceAr, sentenceEn },
  });

  await prisma.reviewState.create({
    data: { userId, flashcardId: flashcard.id, ...emptyReviewStateFields() },
  });

  return NextResponse.json({ vocabItem, flashcard }, { status: 201 });
}
