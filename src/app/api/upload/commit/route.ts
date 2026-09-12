import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { emptyReviewStateFields } from "@/lib/srs";
import type { ParsedDialogue, ParsedGrammarNote, ParsedVocab } from "@/lib/ingest/types";

type Destination =
  | { mode: "existing"; lessonId: number }
  | {
      mode: "new";
      bookTitle: string;
      bookTitleAr?: string;
      unitNumber: number;
      unitTitleAr: string;
      unitTitleEn: string;
      lessonNumber: number;
      lessonSection: string;
    };

async function resolveLessonId(destination: Destination): Promise<number> {
  if (destination.mode === "existing") {
    const lesson = await prisma.lesson.findUnique({ where: { id: destination.lessonId } });
    if (!lesson) throw new Error("Selected lesson no longer exists.");
    return lesson.id;
  }

  const book = await prisma.book.upsert({
    where: { title: destination.bookTitle },
    update: {},
    create: { title: destination.bookTitle, titleAr: destination.bookTitleAr, source: "upload" },
  });
  const unit = await prisma.unit.upsert({
    where: { bookId_number: { bookId: book.id, number: destination.unitNumber } },
    update: {},
    create: {
      bookId: book.id,
      number: destination.unitNumber,
      titleAr: destination.unitTitleAr,
      titleEn: destination.unitTitleEn,
    },
  });
  const lesson = await prisma.lesson.upsert({
    where: { unitId_number: { unitId: unit.id, number: destination.lessonNumber } },
    update: {},
    create: { unitId: unit.id, number: destination.lessonNumber, section: destination.lessonSection },
  });
  return lesson.id;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.destination) {
    return NextResponse.json({ error: "Missing destination" }, { status: 400 });
  }

  const userId = await getUserId();
  const vocab: ParsedVocab[] = Array.isArray(body.vocab) ? body.vocab : [];
  const dialogues: ParsedDialogue[] = Array.isArray(body.dialogues) ? body.dialogues : [];
  const grammarNotes: ParsedGrammarNote[] = Array.isArray(body.grammarNotes) ? body.grammarNotes : [];

  let lessonId: number;
  try {
    lessonId = await resolveLessonId(body.destination as Destination);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid destination";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const topics = await prisma.topic.findMany();
  const topicIdBySlug = new Map(topics.map((t) => [t.slug, t.id]));

  let vocabCreated = 0;
  for (const item of vocab) {
    if (!item.arabic?.trim() || !item.english?.trim()) continue;
    const vocabItem = await prisma.vocabItem.create({
      data: {
        lessonId,
        userId,
        topicId: item.topicSlug ? topicIdBySlug.get(item.topicSlug) ?? null : null,
        arabic: item.arabic.trim(),
        english: item.english.trim(),
        partOfSpeech: item.partOfSpeech || null,
        root: item.root || null,
        gender: item.gender || null,
        plural: item.plural || null,
        notes: item.notes || null,
      },
    });
    const flashcard = await prisma.flashcard.create({ data: { vocabId: vocabItem.id } });
    await prisma.reviewState.create({
      data: { userId, flashcardId: flashcard.id, ...emptyReviewStateFields() },
    });
    vocabCreated++;
  }

  let dialoguesCreated = 0;
  for (const d of dialogues) {
    if (!d.title?.trim() || d.lines.length === 0) continue;
    await prisma.dialogue.create({
      data: {
        lessonId,
        title: d.title.trim(),
        lines: {
          create: d.lines.map((line) => ({
            order: line.order,
            speaker: line.speaker,
            arabic: line.arabic,
            english: line.english,
          })),
        },
      },
    });
    dialoguesCreated++;
  }

  let notesCreated = 0;
  for (const n of grammarNotes) {
    if (!n.title?.trim()) continue;
    await prisma.grammarNote.create({
      data: { lessonId, title: n.title.trim(), bodyAr: n.bodyAr || "", bodyEn: n.bodyEn || "" },
    });
    notesCreated++;
  }

  return NextResponse.json({ lessonId, vocabCreated, dialoguesCreated, notesCreated });
}
