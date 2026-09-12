import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";
import { prisma } from "@/lib/prisma";
import type { AssessmentTask } from "@prisma/client";

// The mark scheme from section 5.8, verbatim: three criteria, three
// bands, mark out of 5 each. Shown to the user before they answer (see
// the /assessment page) and used as the literal marking rubric here.
export const MARK_SCHEME = [
  { criterion: "Content", description: "Did he cover all the required points" },
  { criterion: "Accuracy", description: "Verb prefixes, gender agreement, possessive suffixes, case endings where relevant" },
  { criterion: "Range", description: "Variety of vocabulary and structures beyond the minimum" },
] as const;

export type AssessmentTaskType = "writing" | "speaking_roleplay" | "speaking_photocard" | "speaking_conversation";

const TASK_GENERATION_PROMPT: Record<AssessmentTaskType, string> = {
  writing: `Write a short GCSE-style writing task prompt IN ENGLISH (an instruction, not the answer) for the given Arabic topic, with a target word count (30-60 words). Output JSON: { "prompt": string, "wordCountTarget": number }`,
  speaking_roleplay: `Write a GCSE-style role-play scenario for the given Arabic topic: a short setup sentence and exactly 5 short instructions in English telling the student what to say or ask at each exchange (e.g. "Say hello and give your name", "Ask what time the shop opens"). Output JSON: { "prompt": string, "rolePlayPrompts": string[] }`,
  speaking_photocard: `There is no real photo available, so instead write a vivid, specific English scene description (3-4 sentences) that stands in for a "photo card" on the given Arabic topic — concrete enough that a student could describe it and answer questions about it as if looking at a real photo. Also write 3 follow-up questions in English. Output JSON: { "prompt": string, "rolePlayPrompts": string[] }`,
  speaking_conversation: `Write 4-5 open English-described conversation questions on the given Arabic topic, GCSE general-conversation style (no script, no right answer). Output JSON: { "prompt": string, "rolePlayPrompts": string[] }`,
};

export async function generateAssessmentTask(topicId: number, type: AssessmentTaskType): Promise<AssessmentTask> {
  const topic = await prisma.topic.findUniqueOrThrow({ where: { id: topicId } });
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 500,
    system: `${TASK_GENERATION_PROMPT[type]}\n\nOutput ONLY the JSON object, no commentary.`,
    messages: [{ role: "user", content: `Topic: ${topic.nameEn} (${topic.nameAr})` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");

  const parsed = extractJson<{ prompt: string; wordCountTarget?: number; rolePlayPrompts?: string[] }>(textBlock.text);

  return prisma.assessmentTask.create({
    data: {
      topicId,
      type,
      prompt: parsed.prompt,
      wordCountTarget: parsed.wordCountTarget ?? null,
      rolePlayPrompts: parsed.rolePlayPrompts ? JSON.stringify(parsed.rolePlayPrompts) : null,
    },
  });
}

export type MarkResult = {
  contentScore: number;
  accuracyScore: number;
  rangeScore: number;
  feedback: string;
  modelAnswer: string;
};

export async function markAssessmentAttempt(task: AssessmentTask, responseText: string): Promise<MarkResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1500,
    system: `You mark a student's Arabic writing/speaking response against exactly this scheme, three criteria, 0-5 each:

- Content: did they cover all the required points in the task
- Accuracy: verb prefixes, gender agreement, possessive suffixes, case endings where relevant
- Range: variety of vocabulary and structures beyond the minimum

Feedback style, strictly:
- Direct, no praise inflation ("well done", "great job" etc. are banned)
- Name the specific error, do not restate the whole grammar rule
- No em dashes
- The model answer is for comparison, not correction — write a strong answer to the SAME task, don't rewrite theirs

Output ONLY JSON: { "contentScore": number, "accuracyScore": number, "rangeScore": number, "feedback": string, "modelAnswer": string }`,
    messages: [
      {
        role: "user",
        content: `Task (${task.type}): ${task.prompt}${task.wordCountTarget ? ` (target ~${task.wordCountTarget} words)` : ""}\n\nStudent's response:\n${responseText}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");

  const parsed = extractJson<MarkResult>(textBlock.text);
  const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(n)));

  return {
    contentScore: clamp(parsed.contentScore),
    accuracyScore: clamp(parsed.accuracyScore),
    rangeScore: clamp(parsed.rangeScore),
    feedback: parsed.feedback,
    modelAnswer: parsed.modelAnswer,
  };
}
