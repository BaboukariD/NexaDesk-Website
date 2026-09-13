import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { answersMatch, firstDifferingPosition } from "@/lib/normalize";
import { recordAttemptForStickyWords } from "@/lib/sticky-words";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  const answer = typeof body.answer === "string" ? body.answer : "";
  const responseMs = typeof body.responseMs === "number" ? body.responseMs : 0;
  const reveal = Boolean(body.reveal);

  const userId = await getUserId();
  const word = await prisma.stickyWord.findFirst({ where: { id, userId } });
  if (!word) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (reveal) {
    return NextResponse.json({ correct: false, expected: word.arabic });
  }

  const correct = answersMatch(answer, word.arabic);

  await prisma.$transaction(async (tx) => {
    await tx.attempt.create({
      data: {
        userId,
        itemType: "sticky_word",
        itemId: word.id,
        skill: "writing",
        userAnswer: answer,
        expectedAnswer: word.arabic,
        correct,
        responseMs,
      },
    });
    await recordAttemptForStickyWords(tx, userId, word.arabic, word.gloss ?? "", correct, answer, "production");
  });

  return NextResponse.json({
    correct,
    hintPosition: correct ? undefined : firstDifferingPosition(answer, word.arabic) ?? undefined,
    expected: correct ? word.arabic : undefined,
  });
}
