import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { getManualLessonId } from "@/lib/manual-lesson";
import { emptyReviewStateFields } from "@/lib/srs";
import { autoGloss } from "@/lib/auto-gloss";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const item = await prisma.captureItem.findFirst({ where: { id: Number(id), userId, status: "pending" } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  let english = typeof body.english === "string" ? body.english.trim() : "";
  let root: string | undefined;
  let gender: string | undefined;

  if (!english) {
    try {
      const gloss = await autoGloss(item.arabic);
      english = gloss.english;
      root = gloss.root;
      gender = gloss.gender;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not auto-gloss this word";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const lessonId = await getManualLessonId();
  const vocabItem = await prisma.vocabItem.create({
    data: { lessonId, userId, arabic: item.arabic, english, root, gender, sourceRef: "quick capture" },
  });
  const flashcard = await prisma.flashcard.create({ data: { vocabId: vocabItem.id } });
  await prisma.reviewState.create({ data: { userId, flashcardId: flashcard.id, ...emptyReviewStateFields() } });

  await prisma.captureItem.update({
    where: { id: item.id },
    data: { status: "processed", gloss: english, vocabId: vocabItem.id },
  });

  return NextResponse.json({ vocabItem });
}
