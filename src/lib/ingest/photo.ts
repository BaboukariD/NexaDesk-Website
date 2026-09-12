import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";
import type { ParseResult } from "./types";

// Standard OCR fails badly on vowelled Arabic — the tashkeel gets
// dropped or misread constantly. Claude's vision reads it reliably
// instead, per section 3 of the brief. This reuses the same
// extraction contract as the text-parsing path (src/lib/ingest/text.ts)
// so a photo and a typed transcript produce the same shape, with one
// addition: since a photo can be blurry, angled, or partly cut off,
// Claude is told to mark anything it can't read confidently rather
// than guess at it.

const SYSTEM_PROMPT = `You read a photograph of a page from an Arabic textbook and extract its structured content.

Rules:
- Transcribe Arabic exactly as printed, including tashkeel (vowel marks). Do not add, remove, or "correct" diacritics — copy what's on the page, not what you'd expect a word to say.
- If part of the image is blurry, cut off, or otherwise illegible, do not guess. Add a short warning describing what couldn't be read instead of inventing text.
- Never invent content that isn't visibly on the page. If there's no dialogue, return an empty dialogues array. If a vocab item's gender, root, or part of speech isn't stated or visually obvious, omit that field.
- A dialogue is lines attributed to named or numbered speakers. Plain prose is not a dialogue.
- Only extract an "exercise" if the page poses one explicitly (e.g. "اختر: ما / من ...", a possessive-suffix fill-in, or "كوّن جملة مفيدة"). Do not write new exercises yourself.
- Output ONLY a single JSON object, no commentary, matching exactly this shape:

{
  "warnings": string[],
  "vocab": [{ "arabic": string, "english": string, "partOfSpeech"?: string, "root"?: string, "gender"?: "m"|"f", "plural"?: string, "notes"?: string, "topicSlug"?: string }],
  "dialogues": [{ "title": string, "lines": [{ "order": number, "speaker": string, "arabic": string, "english": string }] }],
  "grammarNotes": [{ "title": string, "bodyAr": string, "bodyEn": string }],
  "exercises": [{ "type": "maa_or_min"|"possessive_suffix"|"fill_gap"|"true_false", "prompt": string, "answer": string, "options"?: string[] }]
}

If the page shows an English gloss for a word or line, use it. If it doesn't, leave "english" as an empty string rather than translating yourself.`;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

export function isSupportedImageType(mediaType: string): mediaType is MediaType {
  return (MEDIA_TYPES as readonly string[]).includes(mediaType);
}

export async function parseLessonPhoto(
  imageBuffer: Buffer,
  mediaType: MediaType,
  availableTopicSlugs: string[]
): Promise<ParseResult> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBuffer.toString("base64") },
          },
          {
            type: "text",
            text: `Available topic slugs (use one only if a vocab item is clearly about that topic, otherwise omit topicSlug): ${availableTopicSlugs.join(", ")}`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content.");
  }

  let parsed: Omit<ParseResult, "source" | "warnings">;
  let claudeWarnings: string[] = [];
  try {
    const raw = extractJson<Omit<ParseResult, "source"> & { warnings?: string[] }>(textBlock.text);
    claudeWarnings = Array.isArray(raw.warnings) ? raw.warnings : [];
    parsed = raw;
  } catch {
    return {
      source: "photo",
      warnings: ["Claude's response could not be parsed as JSON. Nothing was extracted — try a clearer photo or enter this content manually."],
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
    claudeWarnings.push(`${missingEnglish} vocab item(s) had no English gloss on the page — fill these in before confirming.`);
  }

  return { source: "photo", warnings: claudeWarnings, vocab, dialogues, grammarNotes, exercises };
}
