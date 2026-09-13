import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { answersMatch } from "@/lib/normalize";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const vocabId = Number(body.vocabId);
  const answer = typeof body.answer === "string" ? body.answer : "";
  const responseMs = typeof body.responseMs === "number" ? body.responseMs : 0;

  const userId = await getUserId();
  const item = await prisma.vocabItem.findFirst({ where: { id: vocabId, userId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const correct = answersMatch(answer, item.arabic);

  await prisma.attempt.create({
    data: {
      userId,
      itemType: "cold_recall",
      itemId: item.id,
      skill: "writing",
      userAnswer: answer,
      expectedAnswer: item.arabic,
      correct,
      responseMs,
    },
  });

  // "Build next week's drill priority from exactly that" — a failed
  // cold-recall word joins the sticky list directly, which the drill
  // engine already weights toward.
  if (!correct) {
    await prisma.stickyWord.upsert({
      where: { userId_arabic: { userId, arabic: item.arabic } },
      update: { active: true },
      create: { userId, arabic: item.arabic, gloss: item.english, active: true },
    });
  }

  return NextResponse.json({ correct, expected: item.arabic });
}
