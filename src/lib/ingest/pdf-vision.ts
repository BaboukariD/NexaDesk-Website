import { PDFDocument } from "pdf-lib";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import type { ParseResult, ParsedVocab, ParsedDialogue, ParsedGrammarNote, ParsedExercise } from "./types";

// Fallback for a PDF whose text layer failed the reliability check in
// src/lib/ingest/pdf.ts (scanned, garbled OCR, or otherwise untrustworthy).
// Rather than reject the file, this sends it to Claude directly as a
// `document` content block. The API converts each page to an image and
// hands Claude both that image and whatever text layer exists — the
// prompt is told explicitly to ignore the text layer and read the
// scanned image instead, since it's already known to be garbage. This
// is the same task as the photo-upload path (src/lib/ingest/photo.ts),
// reusing its exact output contract, just run once per page instead of
// once per upload.
//
// One page per call, not several. An earlier version batched 6 pages
// per call and hit real, reproducible truncation in production — a
// dense page's worth of vocab across 6 pages doesn't reliably fit an
// 8000-token response, and a truncated response is either invalid JSON
// (a text-based approach) or a torn-off tool-input object (still
// possible even with tool use below, since tool use fixes *shape*, not
// *length*). One page keeps each response's real content small enough
// that hitting the ceiling should be rare; the retry-with-emphasis-on-
// brevity path below is what actually catches it when it isn't.
const PAGES_PER_CHUNK = 1;
const CONCURRENCY = 3;
const MAX_TOKENS = 8000;

const SYSTEM_PROMPT = `You read a page from a photographed or scanned Arabic textbook and extract its structured content.

Rules:
- Transcribe Arabic exactly as printed on the page image, including tashkeel (vowel marks). Do not add, remove, or "correct" diacritics — copy what's on the page, not what you'd expect a word to say.
- This page comes from a PDF whose embedded text layer is known to be unreliable (garbled OCR, or missing entirely). Ignore that text layer completely. Read only the page image itself.
- If part of the page image is blurry, cut off, or otherwise illegible, do not guess. Add a short warning describing what couldn't be read instead of inventing text.
- Never invent content that isn't visibly on the page. If there's no dialogue, return an empty dialogues array. If a vocab item's gender, root, or part of speech isn't stated or visually obvious, omit that field.
- A dialogue is lines attributed to named or numbered speakers. Plain prose is not a dialogue.
- Only extract an "exercise" if the page poses one explicitly (e.g. "اختر: ما / من ...", a possessive-suffix fill-in, or "كوّن جملة مفيدة"). Do not write new exercises yourself.
- Call the extract_lesson_content tool exactly once with everything from this page. Do not write any text outside the tool call.

If the page shows an English gloss for a word or line, use it. If it doesn't, leave "english" as an empty string rather than translating yourself.`;

const BRIEF_RETRY_SUFFIX = `

This page was attempted once already and the response was too long to complete. Be more concise this time: shorter notes, omit optional fields you're not confident about, and keep gloss text brief. Accuracy on what you do include still matters more than covering everything.`;

const EXTRACT_TOOL_NAME = "extract_lesson_content";

const EXTRACT_TOOL = {
  name: EXTRACT_TOOL_NAME,
  description: "Record the structured content extracted from this textbook page.",
  input_schema: {
    type: "object" as const,
    properties: {
      warnings: { type: "array", items: { type: "string" } },
      vocab: {
        type: "array",
        items: {
          type: "object",
          properties: {
            arabic: { type: "string" },
            english: { type: "string" },
            partOfSpeech: { type: "string" },
            root: { type: "string" },
            gender: { type: "string", enum: ["m", "f"] },
            plural: { type: "string" },
            notes: { type: "string" },
            topicSlug: { type: "string" },
          },
          required: ["arabic", "english"],
        },
      },
      dialogues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            lines: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  speaker: { type: "string" },
                  arabic: { type: "string" },
                  english: { type: "string" },
                },
                required: ["order", "speaker", "arabic", "english"],
              },
            },
          },
          required: ["title", "lines"],
        },
      },
      grammarNotes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            bodyAr: { type: "string" },
            bodyEn: { type: "string" },
          },
          required: ["title", "bodyAr", "bodyEn"],
        },
      },
      exercises: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["maa_or_min", "possessive_suffix", "fill_gap", "true_false"] },
            prompt: { type: "string" },
            answer: { type: "string" },
            options: { type: "array", items: { type: "string" } },
          },
          required: ["type", "prompt", "answer"],
        },
      },
    },
    required: ["warnings", "vocab", "dialogues", "grammarNotes", "exercises"],
  },
};

type Chunk = { from: number; to: number; base64: string };
type ExtractedInput = Omit<ParseResult, "source" | "warnings"> & { warnings?: string[] };

async function splitIntoChunks(buffer: Buffer): Promise<Chunk[]> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  const chunks: Chunk[] = [];

  for (let start = 0; start < totalPages; start += PAGES_PER_CHUNK) {
    const end = Math.min(start + PAGES_PER_CHUNK, totalPages);
    const out = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await out.copyPages(src, indices);
    copied.forEach((page) => out.addPage(page));
    const bytes = await out.save();
    chunks.push({ from: start + 1, to: end, base64: Buffer.from(bytes).toString("base64") });
  }

  return chunks;
}

type ChunkResult =
  | { ok: true; from: number; to: number; parsed: ExtractedInput }
  | { ok: false; from: number; to: number; error: string; truncated: boolean };

async function callClaude(chunk: Chunk, availableTopicSlugs: string[], retrying: boolean) {
  const client = getAnthropicClient();
  return client.beta.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    betas: ["pdfs-2024-09-25"],
    system: SYSTEM_PROMPT + (retrying ? BRIEF_RETRY_SUFFIX : ""),
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: chunk.base64 },
          },
          {
            type: "text",
            text: `This is page ${chunk.from} of a scanned textbook. Available topic slugs (use one only if a vocab item is clearly about that topic, otherwise omit topicSlug): ${availableTopicSlugs.join(", ")}`,
          },
        ],
      },
    ],
  });
}

async function attemptChunk(
  chunk: Chunk,
  availableTopicSlugs: string[],
  retrying: boolean
): Promise<{ ok: true; parsed: ExtractedInput } | { ok: false; error: string; truncated: boolean }> {
  const response = await callClaude(chunk, availableTopicSlugs, retrying);

  // A truncation is a distinct, expected failure mode, not a parse
  // bug — flagged explicitly so it reads as "hit the length ceiling"
  // rather than looking like a mystery next time this shows up in logs.
  const truncated = response.stop_reason === "max_tokens";

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return {
      ok: false,
      truncated,
      error: truncated
        ? "Response was truncated (hit the output token limit) before the tool call completed."
        : "Claude did not return a tool call for this page.",
    };
  }

  // With tool use the API already guarantees valid JSON *if* the call
  // completed — but a truncated tool call can still arrive as an
  // incomplete/malformed `input`, so this isn't skipped just because
  // we got a tool_use block at all.
  if (truncated) {
    return { ok: false, truncated: true, error: "Response was truncated (hit the output token limit) mid tool call." };
  }

  return { ok: true, parsed: toolUse.input as ExtractedInput };
}

async function runChunk(chunk: Chunk, availableTopicSlugs: string[]): Promise<ChunkResult> {
  try {
    const first = await attemptChunk(chunk, availableTopicSlugs, false);
    if (first.ok) return { ok: true, from: chunk.from, to: chunk.to, parsed: first.parsed };

    // One retry, with an explicit nudge toward brevity — this is the
    // "smaller scope" available once a chunk is already a single page.
    const retry = await attemptChunk(chunk, availableTopicSlugs, true);
    if (retry.ok) return { ok: true, from: chunk.from, to: chunk.to, parsed: retry.parsed };

    return { ok: false, from: chunk.from, to: chunk.to, error: retry.error, truncated: retry.truncated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, from: chunk.from, to: chunk.to, error: message, truncated: false };
  }
}

export type PdfVisionProgress = { completed: number; total: number; page: number };

export async function extractScannedPdf(
  buffer: Buffer,
  availableTopicSlugs: string[],
  onProgress?: (progress: PdfVisionProgress) => void
): Promise<ParseResult> {
  const chunks = await splitIntoChunks(buffer);

  const results: ChunkResult[] = [];
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (c) => {
        const result = await runChunk(c, availableTopicSlugs);
        onProgress?.({ completed: results.length + batch.indexOf(c) + 1, total: chunks.length, page: c.from });
        return result;
      })
    );
    results.push(...batchResults);
  }

  const vocab: ParsedVocab[] = [];
  const dialogues: ParsedDialogue[] = [];
  const grammarNotes: ParsedGrammarNote[] = [];
  const exercises: ParsedExercise[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (!result.ok) {
      const label = result.truncated ? "truncated" : "failed";
      warnings.push(`Page ${result.from} could not be read (${label}): ${result.error}`);
      continue;
    }
    const p = result.parsed;
    if (Array.isArray(p.vocab)) vocab.push(...p.vocab);
    if (Array.isArray(p.dialogues)) dialogues.push(...p.dialogues);
    if (Array.isArray(p.grammarNotes)) grammarNotes.push(...p.grammarNotes);
    if (Array.isArray(p.exercises)) exercises.push(...p.exercises);
    if (Array.isArray(p.warnings)) warnings.push(...p.warnings.map((w) => `Page ${result.from}: ${w}`));
  }

  const missingEnglish = vocab.filter((v) => !v.english).length;
  if (missingEnglish > 0) {
    warnings.push(`${missingEnglish} vocab item(s) had no English gloss on the page — fill these in before confirming.`);
  }

  return { source: "pdf", warnings, vocab, dialogues, grammarNotes, exercises };
}
