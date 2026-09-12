import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const userId = await getUserId();
  const now = new Date();

  // 1. Anything already scheduled and due wins first.
  const due = await prisma.reviewState.findFirst({
    where: { userId, state: { not: "New" }, due: { lte: now } },
    orderBy: { due: "asc" },
    include: { flashcard: { include: { vocabItem: { include: { topic: true } } } } },
  });

  if (due) return NextResponse.json({ reviewState: due, queue: "due" });

  // 2. Otherwise introduce a new card, capped per day.
  const settings = await prisma.settings.findUniqueOrThrow({ where: { id: "singleton" } });
  const introducedToday = await prisma.reviewState.count({
    where: { userId, reps: 1, lastReview: { gte: startOfToday() } },
  });

  if (introducedToday < settings.newCardsPerDay) {
    const fresh = await prisma.reviewState.findFirst({
      where: { userId, state: "New" },
      orderBy: { id: "asc" },
      include: { flashcard: { include: { vocabItem: { include: { topic: true } } } } },
    });
    if (fresh) return NextResponse.json({ reviewState: fresh, queue: "new" });
  }

  return NextResponse.json({ reviewState: null });
}
