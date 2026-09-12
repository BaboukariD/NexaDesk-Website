import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { pickNextDrill } from "@/lib/drills";

export async function GET(req: Request) {
  const userId = await getUserId();
  const sessionId = Number(new URL(req.url).searchParams.get("sessionId"));

  let accuracy: number | null = null;
  if (sessionId) {
    const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
    accuracy = session?.accuracy ?? null;
  }

  const topicIdParam = new URL(req.url).searchParams.get("topicId");
  const topicId = topicIdParam ? Number(topicIdParam) : undefined;

  const item = await pickNextDrill(userId, accuracy, topicId);
  return NextResponse.json({ item });
}
