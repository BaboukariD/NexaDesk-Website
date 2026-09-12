import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import type { TranslationItem } from "@prisma/client";
import { answersMatch } from "@/lib/normalize";

export type Direction = "en_to_ar" | "ar_to_en";

/**
 * Five sentences at a time, both directions, marked per sentence with
 * partial credit (5.8). Generated using only vocabulary already tied
 * to the topic — same "don't test him on words he wasn't taught"
 * constraint as drill generation (section 8), source direction is the
 * one Claude writes freely (safe either way since the topic vocab is
 * real), target is what gets marked.
 */
export async function generateTranslationTask(topicId: number, direction: Direction) {
  const [topic, vocab] = await Promise.all([
    prisma.topic.findUniqueOrThrow({ where: { id: topicId } }),
    prisma.vocabItem.findMany({ where: { topicId }, take: 40 }),
  ]);

  if (vocab.length === 0) {
    throw new Error("No vocabulary tagged with this topic yet — add some before generating a translation task.");
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1500,
    system: `Write exactly 5 short, simple sentence pairs (English and vowelled Arabic) for the given topic, using mostly the vocabulary list provided — introduce at most one or two extra common words if needed for a natural sentence, no more. These will be used as a translation exercise: the student sees one language and translates to the other.

Output ONLY JSON: { "items": [{ "english": string, "arabic": string }, ...] } (exactly 5 items)`,
    messages: [
      {
        role: "user",
        content: `Topic: ${topic.nameEn}\nVocabulary: ${vocab.map((v) => `${v.arabic} (${v.english})`).join(", ")}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");

  const parsed = extractJson<{ items: { english: string; arabic: string }[] }>(textBlock.text);
  const items = (parsed.items ?? []).slice(0, 5);
  if (items.length === 0) throw new Error("Claude did not return any sentences.");

  const task = await prisma.translationTask.create({ data: { topicId, direction } });
  await prisma.translationItem.createMany({
    data: items.map((it, i) => ({
      translationTaskId: task.id,
      order: i,
      sourceText: direction === "en_to_ar" ? it.english : it.arabic,
      targetText: direction === "en_to_ar" ? it.arabic : it.english,
    })),
  });

  return prisma.translationTask.findUniqueOrThrow({ where: { id: task.id }, include: { items: { orderBy: { order: "asc" } } } });
}

export type TranslationMark = { score: number; feedback: string };

/**
 * 0 = wrong, 1 = partially right, 2 = fully right. For English targets
 * Claude judges naturally; for Arabic targets the normalizer's own
 * lenient match is checked first (a clean pass needs no API round
 * trip to confirm) and Claude is only asked to arbitrate partial
 * credit when it isn't a clean pass.
 */
export async function markTranslationAttempt(item: TranslationItem, direction: Direction, userAnswer: string): Promise<TranslationMark> {
  if (direction === "en_to_ar" && answersMatch(userAnswer, item.targetText)) {
    return { score: 2, feedback: "Correct." };
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 300,
    system: `Mark a single translated sentence. Score 0 (wrong), 1 (partially right — meaning mostly there but a real error), or 2 (fully right — minor spelling/transliteration variation is fine, case endings don't count against it). Direct feedback, name the specific error, no praise inflation, no em dashes. Output ONLY JSON: { "score": 0|1|2, "feedback": string }`,
    messages: [
      {
        role: "user",
        content: `Source: ${item.sourceText}\nReference translation: ${item.targetText}\nStudent's translation: ${userAnswer}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");

  const parsed = extractJson<TranslationMark>(textBlock.text);
  return { score: Math.max(0, Math.min(2, Math.round(parsed.score))), feedback: parsed.feedback };
}
