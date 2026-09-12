import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getUserId();
  const patterns = await prisma.errorPattern.findMany({
    where: { userId, retired: false, frequency: { gt: 0 } },
    orderBy: [{ frequency: "desc" }, { lastSeen: "desc" }],
    take: 5,
  });

  return NextResponse.json(
    patterns.map((p) => ({
      key: p.key,
      description: p.description,
      exampleItems: JSON.parse(p.exampleItems) as string[],
      frequency: p.frequency,
      lastSeen: p.lastSeen,
    }))
  );
}
