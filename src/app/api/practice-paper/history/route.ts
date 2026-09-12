import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET(req: Request) {
  const userId = await getUserId();
  const topicId = new URL(req.url).searchParams.get("topicId");

  const results = await prisma.practicePaperResult.findMany({
    where: { userId, ...(topicId ? { paper: { topicId: Number(topicId) } } : {}) },
    include: { paper: { include: { topic: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(results);
}
