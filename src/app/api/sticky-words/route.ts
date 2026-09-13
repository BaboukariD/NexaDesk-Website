import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getUserId();
  const words = await prisma.stickyWord.findMany({ where: { userId, active: true } });

  const withRate = words
    .map((w) => ({
      id: w.id,
      arabic: w.arabic,
      gloss: w.gloss,
      timesSeen: w.timesSeen,
      timesWrong: w.timesWrong,
      lastWrongAnswers: JSON.parse(w.lastWrongAnswers) as string[],
      skillBreakdown: JSON.parse(w.skillBreakdown),
      hitRate: w.timesSeen === 0 ? 1 : (w.timesSeen - w.timesWrong) / w.timesSeen,
    }))
    .sort((a, b) => a.hitRate - b.hitRate); // worst first

  return NextResponse.json(withRate);
}
