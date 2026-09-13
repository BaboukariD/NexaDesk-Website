import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { getTodaysBlock } from "@/lib/daily-plan";

export async function GET() {
  const userId = await getUserId();
  const block = getTodaysBlock();

  const [cardsDue, topPattern] = await Promise.all([
    prisma.reviewState.count({ where: { userId, state: { not: "New" }, due: { lte: new Date() } } }),
    prisma.errorPattern.findFirst({
      where: { userId, retired: false, frequency: { gt: 0 } },
      orderBy: [{ frequency: "desc" }, { lastSeen: "desc" }],
    }),
  ]);

  return NextResponse.json({
    date: new Date().toISOString(),
    block,
    cardsDue,
    topWeakness: topPattern?.description ?? null,
  });
}
