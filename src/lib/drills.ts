import { prisma } from "@/lib/prisma";
import { answersMatch, englishAnswersMatch, firstDifferingPosition } from "@/lib/normalize";

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

/**
 * Picks the next drill for a user. Direction defaults to production
 * (English -> Arabic), which is where the brief says learning actually
 * happens, and falls back toward recognition once session accuracy
 * drops under ~60% — see section 5.2.
 */
export async function pickNextDrill(userId: number, sessionAccuracy: number | null): Promise<DrillItem | null> {
  const lowAccuracy = sessionAccuracy !== null && sessionAccuracy < 0.6;

  const [vocabItems, sentenceCards, dialogueLines, exercises] = await Promise.all([
    prisma.vocabItem.findMany({ where: { userId } }),
    prisma.flashcard.findMany({
      where: { vocabItem: { userId }, sentenceAr: { not: null } },
      include: { vocabItem: true },
    }),
    prisma.dialogueLine.findMany({ include: { dialogue: true } }),
    prisma.exercise.findMany(),
  ]);

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
      const item = pickRandom(vocabItems)!;
      return {
        token: `vocab:${item.id}:translate_to_ar`,
        type: "translate_to_ar",
        direction: "production",
        instruction: "Translate to Arabic",
        promptEn: item.english,
      };
    }
    case "translate_to_en": {
      const item = pickRandom(vocabItems)!;
      return {
        token: `vocab:${item.id}:translate_to_en`,
        type: "translate_to_en",
        direction: "recognition",
        instruction: "Translate to English",
        promptAr: item.arabic,
      };
    }
    case "fill_gap": {
      const card = pickRandom(sentenceCards)!;
      const blanked = card.sentenceAr!.replace(card.vocabItem.arabic, "___");
      return {
        token: `fillgap:${card.id}:fill_gap`,
        type: "fill_gap",
        direction: "production",
        instruction: "Fill in the blank",
        promptAr: blanked,
        promptEn: card.sentenceEn ?? undefined,
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
      };
    }
    case "true_false": {
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
      };
    }
  }
}

export type GradeResult = {
  correct: boolean;
  hintPosition?: number;
  expected?: string;
};

/**
 * Re-derives the expected answer from the token (never trusts the
 * client for it) and grades the submitted answer.
 */
export async function gradeDrillAnswer(
  token: string,
  userAnswer: string,
  reveal: boolean
): Promise<GradeResult & { skill?: string }> {
  const [kind, idStr, sub, ...rest] = token.split(":");
  const id = Number(idStr);

  if (kind === "vocab" && sub === "translate_to_ar") {
    const item = await prisma.vocabItem.findUniqueOrThrow({ where: { id } });
    const correct = answersMatch(userAnswer, item.arabic);
    return {
      correct,
      hintPosition: correct ? undefined : firstDifferingPosition(userAnswer, item.arabic) ?? undefined,
      expected: reveal || correct ? item.arabic : undefined,
    };
  }

  if (kind === "vocab" && sub === "translate_to_en") {
    const item = await prisma.vocabItem.findUniqueOrThrow({ where: { id } });
    const correct = englishAnswersMatch(userAnswer, item.english);
    return { correct, expected: reveal || correct ? item.english : undefined };
  }

  if (kind === "fillgap") {
    const card = await prisma.flashcard.findUniqueOrThrow({ where: { id }, include: { vocabItem: true } });
    const correct = answersMatch(userAnswer, card.vocabItem.arabic);
    return {
      correct,
      hintPosition: correct ? undefined : firstDifferingPosition(userAnswer, card.vocabItem.arabic) ?? undefined,
      expected: reveal || correct ? card.vocabItem.arabic : undefined,
    };
  }

  if (kind === "scramble") {
    const expectedWords =
      sub === "line"
        ? (await prisma.dialogueLine.findUniqueOrThrow({ where: { id } })).arabic.split(/\s+/).filter(Boolean)
        : (await prisma.flashcard.findUniqueOrThrow({ where: { id } })).sentenceAr!.split(/\s+/).filter(Boolean);
    const userWords = userAnswer.split(/\s+/).filter(Boolean);
    const correct = userWords.length === expectedWords.length && userWords.every((w, i) => w === expectedWords[i]);
    return { correct, expected: reveal || correct ? expectedWords.join(" ") : undefined };
  }

  if (kind === "truefalse") {
    const wasTrue = sub === "true";
    const correct = userAnswer.trim().toLowerCase() === (wasTrue ? "true" : "false");
    const line = await prisma.dialogueLine.findUniqueOrThrow({ where: { id } });
    return { correct, expected: reveal || correct ? (wasTrue ? "True" : "False") + ` — ${line.arabic}` : undefined };
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
      skill: exercise.skill ?? undefined,
    };
  }

  throw new Error(`Unrecognised drill token: ${token}`);
}
