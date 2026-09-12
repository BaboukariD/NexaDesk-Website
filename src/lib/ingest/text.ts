import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";
import type { ParseResult } from "./types";

const SYSTEM_PROMPT = `You extract structured Arabic-lesson content from raw text (a book excerpt, a class transcript, or a vocabulary list someone typed loosely).

Rules:
- Preserve Arabic exactly as written, including tashkeel (vowel marks). Never add, remove, or "correct" diacritics that aren't in the source.
- Never invent content. If the text has no dialogue, return an empty dialogues array. If a vocab item's gender, root, or part of speech isn't stated or obvious from the word's own form, omit that field rather than guessing.
- A dialogue is lines attributed to named or numbered speakers (أ, ب, or actual names). Plain prose is not a dialogue.
- Only extract an "exercise" if the source text itself poses one explicitly (e.g. "اختر: ما / من ...", a possessive-suffix fill-in, or "كوّن جملة مفيدة" with scrambled words). Do not write new exercises yourself — that risks producing something subtly wrong that a hafiz-level reader would catch and lose trust in.
- Output ONLY a single JSON object, no commentary, matching exactly this shape:

{
  "vocab": [{ "arabic": string, "english": string, "partOfSpeech"?: string, "root"?: string, "gender"?: "m"|"f", "plural"?: string, "notes"?: string, "topicSlug"?: string }],
  "dialogues": [{ "title": string, "lines": [{ "order": number, "speaker": string, "arabic": string, "english": string }] }],
  "grammarNotes": [{ "title": string, "bodyAr": string, "bodyEn": string }],
  "exercises": [{ "type": "maa_or_min"|"possessive_suffix"|"fill_gap"|"true_false", "prompt": string, "answer": string, "options"?: string[] }]
}

If the text includes an English gloss for a word or line, use it. If it doesn't, leave "english" as an empty string rather than translating yourself — translation quality needs a human to check, this pass is extraction only.`;

export async function parseLessonText(
  rawText: string,
  availableTopicSlugs: string[]
): Promise<ParseResult> {
  if (!rawText.trim()) {
    return { source: "text", warnings: ["The file is empty."], vocab: [], dialogues: [], grammarNotes: [], exercises: [] };
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Available topic slugs (use one only if a vocab item is clearly about that topic, otherwise omit topicSlug): ${availableTopicSlugs.join(", ")}\n\nText to extract from:\n\n${rawText}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  const warnings: string[] = [];
  let parsed: Omit<ParseResult, "source" | "warnings">;
  try {
    parsed = extractJson(textBlock.text);
  } catch {
    return {
      source: "text",
      warnings: ["Claude's response could not be parsed as JSON. Nothing was extracted — try again or enter this content manually."],
      vocab: [],
      dialogues: [],
      grammarNotes: [],
      exercises: [],
    };
  }

  const vocab = Array.isArray(parsed.vocab) ? parsed.vocab : [];
  const dialogues = Array.isArray(parsed.dialogues) ? parsed.dialogues : [];
  const grammarNotes = Array.isArray(parsed.grammarNotes) ? parsed.grammarNotes : [];
  const exercises = Array.isArray(parsed.exercises) ? parsed.exercises : [];

  const missingEnglish = vocab.filter((v) => !v.english).length;
  if (missingEnglish > 0) {
    warnings.push(`${missingEnglish} vocab item(s) had no English gloss in the source — fill these in before confirming.`);
  }

  return { source: "text", warnings, vocab, dialogues, grammarNotes, exercises };
}
