import { prisma } from "@/lib/prisma";

// The seeded "Manual additions" book/unit/lesson that hand-entered
// vocab attaches to when it isn't part of an uploaded book.
export async function getManualLessonId(): Promise<number> {
  const book = await prisma.book.findUniqueOrThrow({ where: { title: "Manual additions" } });
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { bookId_number: { bookId: book.id, number: 0 } },
  });
  const lesson = await prisma.lesson.findUniqueOrThrow({
    where: { unitId_number: { unitId: unit.id, number: 0 } },
  });
  return lesson.id;
}
