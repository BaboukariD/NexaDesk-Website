import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { emptyReviewStateFields } from "@/lib/srs";
import { toSkeleton } from "@/lib/normalize";
import type { ParsedDialogue, ParsedExercise, ParsedGrammarNote, ParsedVocab } from "@/lib/ingest/types";

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
  const exercises: ParsedExercise[] = Array.isArray(body.exercises) ? body.exercises : [];

  let lessonId: number;
  try {
    lessonId = await resolveLessonId(body.destination as Destination);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid destination";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const topics = await prisma.topic.findMany();
  const topicIdBySlug = new Map(topics.map((t) => [t.slug, t.id]));

  // Section T: "deduplicate on normalised Arabic form so the same word
  // from two books becomes one entry with two sources, not two
  // entries." A source reference derived from the destination itself
  // — every word can be traced back to where it came from either way.
  const destination = body.destination as Destination;
  const sourceRef =
    destination.mode === "new"
      ? `${destination.bookTitle}, unit ${destination.unitNumber}, lesson ${destination.lessonNumber}`
      : `lesson #${destination.lessonId}`;

  const existingVocab = await prisma.vocabItem.findMany({ where: { userId } });
  const existingBySkeleton = new Map(existingVocab.map((v) => [toSkeleton(v.arabic), v]));

  let vocabCreated = 0;
  let vocabMerged = 0;
  for (const item of vocab) {
    if (!item.arabic?.trim() || !item.english?.trim()) continue;
    const skeleton = toSkeleton(item.arabic);
    const existing = existingBySkeleton.get(skeleton);

    if (existing) {
      // Same word already known — record the additional source rather
      // than creating a duplicate entry.
      if (!existing.sourceRef?.includes(sourceRef)) {
        await prisma.vocabItem.update({
          where: { id: existing.id },
          data: { sourceRef: existing.sourceRef ? `${existing.sourceRef}; ${sourceRef}` : sourceRef },
        });
      }
      vocabMerged++;
      continue;
    }

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
        sourceRef,
      },
    });
    existingBySkeleton.set(skeleton, vocabItem);
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

  let exercisesCreated = 0;
  for (const ex of exercises) {
    if (!ex.prompt?.trim() || !ex.answer?.trim()) continue;
    await prisma.exercise.create({
      data: {
        lessonId,
        type: ex.type,
        prompt: ex.prompt.trim(),
        answer: ex.answer.trim(),
        options: ex.options && ex.options.length > 0 ? JSON.stringify(ex.options) : null,
      },
    });
    exercisesCreated++;
  }

  return NextResponse.json({ lessonId, vocabCreated, vocabMerged, dialoguesCreated, notesCreated, exercisesCreated });
}
