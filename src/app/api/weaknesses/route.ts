import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { getSlowButCorrectItems } from "@/lib/slow-items";

export async function GET() {
  const userId = await getUserId();
  const [patterns, slowItems] = await Promise.all([
    prisma.errorPattern.findMany({
      where: { userId, retired: false, frequency: { gt: 0 } },
      orderBy: [{ frequency: "desc" }, { lastSeen: "desc" }],
      take: 5,
    }),
    getSlowButCorrectItems(userId),
  ]);

  return NextResponse.json({
    patterns: patterns.map((p) => ({
      key: p.key,
      description: p.description,
      exampleItems: JSON.parse(p.exampleItems) as string[],
      frequency: p.frequency,
      lastSeen: p.lastSeen,
    })),
    slowItems,
  });
}
