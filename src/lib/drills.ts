import { prisma } from "@/lib/prisma";
import { answersMatch, englishAnswersMatch, firstDifferingPosition, toSkeleton } from "@/lib/normalize";

export type DrillType =
  | "translate_to_ar"
  | "translate_to_en"
  | "fill_gap"
  | "maa_or_min"
  | "possessive_suffix"
  | "scrambled_sentence"
  | "true_false";

export type DrillItem = {
  token: string;
  type: DrillType;
  direction: "production" | "recognition" | "grammar";
  instruction: string;
  promptAr?: string;
  promptEn?: string;
  options?: string[];
  skill?: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[]): T | null {
  return arr.length === 0 ? null : arr[Math.floor(Math.random() * arr.length)];
}

const PRIORITY_WEIGHT = 0.65;

/**
 * Picks from `items`, preferring ones flagged by an active error
 * pattern (see lib/error-patterns.ts) most of the time — "weight
 * future drills toward what he keeps getting wrong" (section 5.3) —
 * while still surfacing everything else often enough to not go stale.
 */
function pickWeighted<T>(items: T[], arabicOf: (item: T) => string, prioritySkeletons: Set<string>): T | null {
  if (items.length === 0) return null;
  if (prioritySkeletons.size > 0 && Math.random() < PRIORITY_WEIGHT) {
    const flagged = items.filter((item) => prioritySkeletons.has(toSkeleton(arabicOf(item))));
    if (flagged.length > 0) return pickRandom(flagged);
  }
  return pickRandom(items);
}

/**
 * Picks the next drill for a user. Direction defaults to production
 * (English -> Arabic), which is where the brief says learning actually
 * happens, and falls back toward recognition once session accuracy
 * drops under ~60% — see section 5.2.
 */
export async function pickNextDrill(
  userId: number,
  sessionAccuracy: number | null,
  topicId?: number
): Promise<DrillItem | null> {
  const lowAccuracy = sessionAccuracy !== null && sessionAccuracy < 0.6;

  // Dialogues aren't topic-tagged in this schema (only vocab, exercises,
  // grammar notes, and the 5.8 assessment tables are), so a topic
  // filter narrows the vocab-and-exercise-based types but leaves
  // scrambled_sentence/true_false drawing from all dialogues even when
  // a topic is selected — a known, disclosed simplification.
  const [vocabItems, sentenceCards, dialogueLines, exercises, activePatterns] = await Promise.all([
    prisma.vocabItem.findMany({ where: { userId, ...(topicId ? { topicId } : {}) } }),
    prisma.flashcard.findMany({
      where: { vocabItem: { userId, ...(topicId ? { topicId } : {}) }, sentenceAr: { not: null } },
      include: { vocabItem: true },
    }),
    prisma.dialogueLine.findMany({ include: { dialogue: true } }),
    prisma.exercise.findMany({ where: topicId ? { topicId } : {} }),
    prisma.errorPattern.findMany({ where: { userId, retired: false, frequency: { gt: 0 } } }),
  ]);

  const prioritySkeletons = new Set(
    activePatterns.flatMap((p) => (JSON.parse(p.exampleItems) as string[]).map(toSkeleton))
  );

  const weights: { type: DrillType; weight: number; available: boolean }[] = [
    { type: "translate_to_ar", weight: lowAccuracy ? 1 : 3, available: vocabItems.length > 0 },
    { type: "translate_to_en", weight: lowAccuracy ? 3 : 1, available: vocabItems.length > 0 },
    { type: "fill_gap", weight: lowAccuracy ? 1 : 2, available: sentenceCards.length > 0 },
    { type: "scrambled_sentence", weight: lowAccuracy ? 1 : 2, available: dialogueLines.length > 0 || sentenceCards.length > 0 },
    { type: "true_false", weight: lowAccuracy ? 2 : 1, available: dialogueLines.length >= 2 },
    { type: "maa_or_min", weight: 1, available: exercises.some((e) => e.type === "maa_or_min") },
    { type: "possessive_suffix", weight: 1, available: exercises.some((e) => e.type === "possessive_suffix") },
  ];

  const pool = weights.filter((w) => w.available);
  if (pool.length === 0) return null;

  const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen: DrillType = pool[0].type;
  for (const w of pool) {
    roll -= w.weight;
    if (roll <= 0) {
      chosen = w.type;
      break;
    }
  }

  switch (chosen) {
    case "translate_to_ar": {
      const item = pickWeighted(vocabItems, (v) => v.arabic, prioritySkeletons)!;
      return {
        token: `vocab:${item.id}:translate_to_ar`,
        type: "translate_to_ar",
        direction: "production",
        instruction: "Translate to Arabic",
        promptEn: item.english,
        skill: "writing",
      };
    }
    case "translate_to_en": {
      const item = pickWeighted(vocabItems, (v) => v.arabic, prioritySkeletons)!;
      return {
        token: `vocab:${item.id}:translate_to_en`,
        type: "translate_to_en",
        direction: "recognition",
        instruction: "Translate to English",
        promptAr: item.arabic,
        skill: "reading",
      };
    }
    case "fill_gap": {
      const card = pickWeighted(sentenceCards, (c) => c.vocabItem.arabic, prioritySkeletons)!;
      const blanked = card.sentenceAr!.replace(card.vocabItem.arabic, "___");
      return {
        token: `fillgap:${card.id}:fill_gap`,
        type: "fill_gap",
        direction: "production",
        instruction: "Fill in the blank",
        promptAr: blanked,
        promptEn: card.sentenceEn ?? undefined,
        skill: "writing",
      };
    }
    case "scrambled_sentence": {
      const useDialogue = dialogueLines.length > 0 && (Math.random() < 0.5 || sentenceCards.length === 0);
      if (useDialogue) {
        const line = pickRandom(dialogueLines)!;
        const words = line.arabic.split(/\s+/).filter(Boolean);
        return {
          token: `scramble:${line.id}:line`,
          type: "scrambled_sentence",
          direction: "production",
          instruction: "Build a sentence from these words (كوّن جملة مفيدة)",
          promptEn: line.english,
          options: shuffle(words),
          skill: "writing",
        };
      }
      const card = pickRandom(sentenceCards)!;
      const words = card.sentenceAr!.split(/\s+/).filter(Boolean);
      return {
        token: `scramble:${card.id}:card`,
        type: "scrambled_sentence",
        direction: "production",
        instruction: "Build a sentence from these words (كوّن جملة مفيدة)",
        promptEn: card.sentenceEn ?? undefined,
        options: shuffle(words),
        skill: "writing",
      };
    }
    case "true_false": {
      // No audio in this app, so a dialogue line read as text is the
      // closest available proxy for listening comprehension.
      const line = pickRandom(dialogueLines)!;
      const sameDialogue = dialogueLines.filter((l) => l.dialogueId === line.dialogueId && l.id !== line.id);
      const showTrue = sameDialogue.length === 0 || Math.random() < 0.5;
      const englishShown = showTrue ? line.english : pickRandom(sameDialogue)?.english ?? line.english;
      return {
        token: `truefalse:${line.id}:${showTrue ? "true" : "false"}`,
        type: "true_false",
        direction: "recognition",
        instruction: "True or false: does the English match the Arabic?",
        promptAr: line.arabic,
        promptEn: englishShown,
        options: ["True", "False"],
        skill: "listening",
      };
    }
    case "maa_or_min":
    case "possessive_suffix": {
      const typeExercises = exercises.filter((e) => e.type === chosen);
      const exercise = pickRandom(typeExercises)!;
      return {
        token: `exercise:${exercise.id}`,
        type: chosen,
        direction: "grammar",
        instruction: chosen === "maa_or_min" ? "Choose ما or من" : "Choose the right possessive suffix",
        promptAr: exercise.prompt,
        options: exercise.options ? JSON.parse(exercise.options) : undefined,
        skill: exercise.skill ?? "writing",
      };
    }
  }
}

export type GradeResult = {
  correct: boolean;
  hintPosition?: number;
  expected?: string;
  // Always populated, even when `expected` is withheld from the
  // client — the error model needs the true reference answer to
  // detect and later retire patterns. `arabicTarget: false` marks
  // shapes (English recognition, whole sentences, True/False) where
  // the six word-level detectors don't apply and shouldn't be run.
  expectedInternal: string;
  arabicTarget: boolean;
  englishGloss?: string;
  skill?: string;
};

/**
 * Re-derives the expected answer from the token (never trusts the
 * client for it) and grades the submitted answer.
 */
export async function gradeDrillAnswer(
  token: string,
  userAnswer: string,
  reveal: boolean
): Promise<GradeResult> {
  const [kind, idStr, sub] = token.split(":");
  const id = Number(idStr);

  if (kind === "vocab" && sub === "translate_to_ar") {
    const item = await prisma.vocabItem.findUniqueOrThrow({ where: { id } });
    const correct = answersMatch(userAnswer, item.arabic);
    return {
      correct,
      hintPosition: correct ? undefined : firstDifferingPosition(userAnswer, item.arabic) ?? undefined,
      expected: reveal || correct ? item.arabic : undefined,
      expectedInternal: item.arabic,
      arabicTarget: true,
      englishGloss: item.english,
      skill: "writing",
    };
  }

  if (kind === "vocab" && sub === "translate_to_en") {
    const item = await prisma.vocabItem.findUniqueOrThrow({ where: { id } });
    const correct = englishAnswersMatch(userAnswer, item.english);
    return {
      correct,
      expected: reveal || correct ? item.english : undefined,
      expectedInternal: item.english,
      arabicTarget: false,
      skill: "reading",
    };
  }

  if (kind === "fillgap") {
    const card = await prisma.flashcard.findUniqueOrThrow({ where: { id }, include: { vocabItem: true } });
    const correct = answersMatch(userAnswer, card.vocabItem.arabic);
    return {
      correct,
      hintPosition: correct ? undefined : firstDifferingPosition(userAnswer, card.vocabItem.arabic) ?? undefined,
      expected: reveal || correct ? card.vocabItem.arabic : undefined,
      expectedInternal: card.vocabItem.arabic,
      arabicTarget: true,
      englishGloss: card.vocabItem.english,
      skill: "writing",
    };
  }

  if (kind === "scramble") {
    const expectedWords =
      sub === "line"
        ? (await prisma.dialogueLine.findUniqueOrThrow({ where: { id } })).arabic.split(/\s+/).filter(Boolean)
        : (await prisma.flashcard.findUniqueOrThrow({ where: { id } })).sentenceAr!.split(/\s+/).filter(Boolean);
    const userWords = userAnswer.split(/\s+/).filter(Boolean);
    const correct = userWords.length === expectedWords.length && userWords.every((w, i) => w === expectedWords[i]);
    const joined = expectedWords.join(" ");
    return {
      correct,
      expected: reveal || correct ? joined : undefined,
      expectedInternal: joined,
      arabicTarget: false,
      skill: "writing",
    };
  }

  if (kind === "truefalse") {
    const wasTrue = sub === "true";
    const correct = userAnswer.trim().toLowerCase() === (wasTrue ? "true" : "false");
    const line = await prisma.dialogueLine.findUniqueOrThrow({ where: { id } });
    const expectedInternal = (wasTrue ? "True" : "False") + ` — ${line.arabic}`;
    return {
      correct,
      expected: reveal || correct ? expectedInternal : undefined,
      expectedInternal,
      arabicTarget: false,
      skill: "listening",
    };
  }

  if (kind === "exercise") {
    const exercise = await prisma.exercise.findUniqueOrThrow({ where: { id } });
    const correct =
      exercise.type === "maa_or_min" || exercise.type === "possessive_suffix"
        ? userAnswer.trim() === exercise.answer.trim()
        : answersMatch(userAnswer, exercise.answer);
    return {
      correct,
      expected: reveal || correct ? exercise.answer : undefined,
      expectedInternal: exercise.answer,
      arabicTarget: exercise.type === "maa_or_min" || exercise.type === "possessive_suffix",
      skill: exercise.skill ?? "writing",
    };
  }

  throw new Error(`Unrecognised drill token: ${token}`);
}
