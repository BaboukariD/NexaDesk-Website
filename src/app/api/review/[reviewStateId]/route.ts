import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { grade, Rating, type Grade } from "@/lib/srs";

const VALID_RATINGS = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

export async function POST(req: Request, { params }: { params: Promise<{ reviewStateId: string }> }) {
  const { reviewStateId } = await params;
  const id = Number(reviewStateId);
  const userId = await getUserId();

  const row = await prisma.reviewState.findFirst({ where: { id, userId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const rating = body.rating as Grade;
  const responseMs = typeof body.responseMs === "number" ? body.responseMs : 0;

  if (!VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: "rating must be 1 (Again), 2 (Hard), 3 (Good) or 4 (Easy)" }, { status: 400 });
  }

  const { fields, scheduledDays } = grade(row, rating);

  const [updated] = await prisma.$transaction([
    prisma.reviewState.update({ where: { id }, data: fields }),
    prisma.attempt.create({
      data: {
        userId,
        itemType: "flashcard",
        itemId: row.flashcardId,
        userAnswer: String(rating),
        correct: rating >= Rating.Good,
        responseMs,
      },
    }),
  ]);

  return NextResponse.json({ reviewState: updated, scheduledDays });
}
