import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { gradeDrillAnswer } from "@/lib/drills";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const userId = await getUserId();
  const sessionId = Number(body.sessionId);
  const answer = typeof body.answer === "string" ? body.answer : "";
  const reveal = Boolean(body.reveal);
  const responseMs = typeof body.responseMs === "number" ? body.responseMs : 0;

  let result;
  try {
    result = await gradeDrillAnswer(body.token, answer, reveal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not grade this answer";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // A "show answer" request isn't an attempt at recall — don't log or
  // count it, it would corrupt both the error model and the session's
  // accuracy-based direction fallback.
  if (!reveal) {
    const [, idStr] = body.token.split(":");
    await prisma.$transaction(async (tx) => {
      await tx.attempt.create({
        data: {
          userId,
          itemType: "drill",
          itemId: Number(idStr) || 0,
          skill: result.skill ?? null,
          userAnswer: answer,
          correct: result.correct,
          responseMs,
        },
      });

      if (sessionId) {
        const session = await tx.session.findFirst({ where: { id: sessionId, userId } });
        if (session) {
          const priorCount = session.itemsAttempted;
          const priorAccuracy = session.accuracy ?? 1;
          const newCount = priorCount + 1;
          const newAccuracy = (priorAccuracy * priorCount + (result.correct ? 1 : 0)) / newCount;
          await tx.session.update({
            where: { id: sessionId },
            data: { itemsAttempted: newCount, accuracy: newAccuracy },
          });
        }
      }
    });
  }

  return NextResponse.json(result);
}
