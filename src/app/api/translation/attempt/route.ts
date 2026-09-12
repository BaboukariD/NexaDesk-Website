import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { markTranslationAttempt, type Direction } from "@/lib/translation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const itemId = Number(body.itemId);
  const userAnswer = typeof body.userAnswer === "string" ? body.userAnswer.trim() : "";

  if (!itemId || !userAnswer) {
    return NextResponse.json({ error: "itemId and userAnswer are required" }, { status: 400 });
  }

  const userId = await getUserId();
  const item = await prisma.translationItem.findUnique({
    where: { id: itemId },
    include: { translationTask: true },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  try {
    const mark = await markTranslationAttempt(item, item.translationTask.direction as Direction, userAnswer);
    const attempt = await prisma.translationAttempt.create({
      data: { userId, translationItemId: itemId, userAnswer, score: mark.score, feedback: mark.feedback },
    });
    return NextResponse.json(attempt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not mark this translation";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
