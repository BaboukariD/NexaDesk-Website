import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();

  const dialogue = await prisma.dialogue.findUnique({
    where: { id: Number(id) },
    include: {
      lesson: { include: { unit: { include: { book: true } } } },
      lines: {
        orderBy: { order: "asc" },
        include: {
          recordings: {
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, createdAt: true },
          },
        },
      },
    },
  });
  if (!dialogue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(dialogue);
}
