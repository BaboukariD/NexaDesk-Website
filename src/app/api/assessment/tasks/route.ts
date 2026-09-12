import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");
  const type = searchParams.get("type");

  const tasks = await prisma.assessmentTask.findMany({
    where: {
      ...(topicId ? { topicId: Number(topicId) } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json(tasks);
}
