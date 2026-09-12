import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import { generateAssessmentTask, markAssessmentAttempt } from "@/lib/assessment";
import { generateTranslationTask, markTranslationAttempt } from "@/lib/translation";
import { englishAnswersMatch } from "@/lib/normalize";

type QA = { question: string; answer: string };

/**
 * "Once a topic is complete... a listening section using the book's
 * transcripts, a reading comprehension, a translation both ways, and
 * a writing task with a word count" (5.8). There's no audio in this
 * app, so "listening" is a transcript read as text rather than heard
 * — the same substitution already used for the true_false drill type.
 * Comprehension questions are generated in English specifically so
 * they can be graded deterministically without another API round
 * trip per answer.
 */
export async function generatePracticePaper(topicId: number) {
  const topic = await prisma.topic.findUniqueOrThrow({ where: { id: topicId } });
  const vocab = await prisma.vocabItem.findMany({ where: { topicId }, take: 30 });

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    system: `Write material for a short Arabic-learner practice paper on the given topic, using mostly the vocabulary list provided.

1. A short listening transcript (3-5 lines, vowelled Arabic + English) as if it were a spoken passage, with 2-3 comprehension questions in English with short English answers.
2. A short reading passage (different content, vowelled Arabic + English), with 2-3 comprehension questions in English with short English answers.

Output ONLY JSON: { "listeningAr": string, "listeningEn": string, "listeningQuestions": [{"question": string, "answer": string}], "readingAr": string, "readingEn": string, "readingQuestions": [{"question": string, "answer": string}] }`,
    messages: [
      { role: "user", content: `Topic: ${topic.nameEn}\nVocabulary: ${vocab.map((v) => `${v.arabic} (${v.english})`).join(", ")}` },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");
  const parsed = extractJson<{
    listeningAr: string;
    listeningEn: string;
    listeningQuestions: QA[];
    readingAr: string;
    readingEn: string;
    readingQuestions: QA[];
  }>(textBlock.text);

  const [writingTask, translationTask] = await Promise.all([
    generateAssessmentTask(topicId, "writing"),
    generateTranslationTask(topicId, "en_to_ar"),
  ]);

  return prisma.practicePaper.create({
    data: {
      topicId,
      listeningTranscriptAr: parsed.listeningAr,
      listeningTranscriptEn: parsed.listeningEn,
      listeningQuestions: JSON.stringify(parsed.listeningQuestions ?? []),
      readingPassageAr: parsed.readingAr,
      readingPassageEn: parsed.readingEn,
      readingQuestions: JSON.stringify(parsed.readingQuestions ?? []),
      writingTaskId: writingTask.id,
      translationTaskId: translationTask.id,
    },
    include: { writingTask: true, translationTask: { include: { items: true } } },
  });
}

export async function submitPracticePaper(
  paperId: number,
  userId: number,
  input: {
    listeningAnswers: string[];
    readingAnswers: string[];
    writingResponseText: string;
    translationAnswers: string[]; // aligned to translationTask.items order
    durationSeconds: number;
  }
) {
  const paper = await prisma.practicePaper.findUniqueOrThrow({
    where: { id: paperId },
    include: { writingTask: true, translationTask: { include: { items: { orderBy: { order: "asc" } } } } },
  });

  const listeningQuestions: QA[] = JSON.parse(paper.listeningQuestions);
  const readingQuestions: QA[] = JSON.parse(paper.readingQuestions);

  const score = (questions: QA[], answers: string[]) => {
    if (questions.length === 0) return 100;
    const correct = questions.filter((q, i) => englishAnswersMatch(answers[i] ?? "", q.answer)).length;
    return (correct / questions.length) * 100;
  };

  const listeningScorePct = score(listeningQuestions, input.listeningAnswers);
  const readingScorePct = score(readingQuestions, input.readingAnswers);

  const writingMark = await markAssessmentAttempt(paper.writingTask!, input.writingResponseText);
  await prisma.assessmentAttempt.create({
    data: {
      userId,
      taskId: paper.writingTaskId!,
      responseText: input.writingResponseText,
      contentScore: writingMark.contentScore,
      accuracyScore: writingMark.accuracyScore,
      rangeScore: writingMark.rangeScore,
      feedback: writingMark.feedback,
      modelAnswer: writingMark.modelAnswer,
    },
  });

  const translationScores: number[] = [];
  for (let i = 0; i < paper.translationTask!.items.length; i++) {
    const item = paper.translationTask!.items[i];
    const userAnswer = input.translationAnswers[i] ?? "";
    const mark = await markTranslationAttempt(item, "en_to_ar", userAnswer);
    await prisma.translationAttempt.create({
      data: { userId, translationItemId: item.id, userAnswer, score: mark.score, feedback: mark.feedback },
    });
    translationScores.push(mark.score);
  }
  const translationScorePct =
    translationScores.length === 0 ? 100 : (translationScores.reduce((s, n) => s + n, 0) / (translationScores.length * 2)) * 100;

  const writingPct = ((writingMark.contentScore + writingMark.accuracyScore + writingMark.rangeScore) / 15) * 100;
  const overallPct = (listeningScorePct + readingScorePct + writingPct + translationScorePct) / 4;

  return prisma.practicePaperResult.create({
    data: {
      paperId,
      userId,
      listeningScorePct,
      readingScorePct,
      writingContentScore: writingMark.contentScore,
      writingAccuracyScore: writingMark.accuracyScore,
      writingRangeScore: writingMark.rangeScore,
      translationScorePct,
      overallPct,
      durationSeconds: input.durationSeconds,
    },
  });
}
