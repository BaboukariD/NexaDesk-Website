import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Section P: dialogues come only from real uploaded lesson material
// (see src/app/api/upload/commit/route.ts) — nothing here is invented.
export async function GET() {
  const dialogues = await prisma.dialogue.findMany({
    include: {
      lesson: { include: { unit: { include: { book: true } } } },
      _count: { select: { lines: true } },
    },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(dialogues);
}
