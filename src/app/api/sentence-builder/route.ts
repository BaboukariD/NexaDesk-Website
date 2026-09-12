import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const topicId = new URL(req.url).searchParams.get("topicId");
  const sets = await prisma.sentenceBuilderSet.findMany({
    where: topicId ? { topicId: Number(topicId) } : {},
    include: {
      topic: true,
      columns: { orderBy: { order: "asc" }, include: { options: true } },
    },
  });
  return NextResponse.json(sets);
}
