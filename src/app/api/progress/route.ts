import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { getWordsKnownVsSeen, getWeeklyAccuracy, getUnitsProgress } from "@/lib/progress";

export async function GET() {
  const userId = await getUserId();

  const [wordsCounts, weeklyAccuracy, unitsProgress, topWeaknesses] = await Promise.all([
    getWordsKnownVsSeen(userId),
    getWeeklyAccuracy(userId),
    getUnitsProgress(userId),
    prisma.errorPattern.findMany({
      where: { userId, retired: false, frequency: { gt: 0 } },
      orderBy: [{ frequency: "desc" }, { lastSeen: "desc" }],
      take: 5,
      select: { description: true, frequency: true },
    }),
  ]);

  return NextResponse.json({ ...wordsCounts, weeklyAccuracy, unitsProgress, topWeaknesses });
}
