import { PDFDocument } from "pdf-lib";
import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";
import type { ParseResult, ParsedVocab, ParsedDialogue, ParsedGrammarNote, ParsedExercise } from "./types";

// Fallback for a PDF whose text layer failed the reliability check in
// src/lib/ingest/pdf.ts (scanned, garbled OCR, or otherwise untrustworthy).
// Rather than reject the file, this sends it to Claude directly as a
// `document` content block. The API converts each page to an image and
// hands Claude both that image and whatever text layer exists — the
// prompt is told explicitly to ignore the text layer and read the
// scanned image instead, since it's already known to be garbage. This
// is the same task as the photo-upload path (src/lib/ingest/photo.ts),
// reusing its exact output contract, just run once per chunk instead of
// once per page.
//
// Chunked rather than sent whole: Claude's PDF support caps a request
// at 100 pages (under a 1M-token context) and 32MB, and each page costs
// roughly what an image does — a 49-page book in one call is a large
// input and would need a large output to match. Chunking keeps each
// response small enough to fit comfortably in max_tokens, and means one
// bad or illegible chunk only costs that chunk, not the whole upload.
const PAGES_PER_CHUNK = 6;
const CONCURRENCY = 3;

const SYSTEM_PROMPT = `You read pages from a photographed or scanned Arabic textbook and extract their structured content.

Rules:
- Transcribe Arabic exactly as printed on the page images, including tashkeel (vowel marks). Do not add, remove, or "correct" diacritics — copy what's on the page, not what you'd expect a word to say.
- These pages come from a PDF whose embedded text layer is known to be unreliable (garbled OCR, or missing entirely). Ignore that text layer completely. Read only the page images themselves.
- If part of a page image is blurry, cut off, or otherwise illegible, do not guess. Add a short warning describing what couldn't be read instead of inventing text.
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

If a page shows an English gloss for a word or line, use it. If it doesn't, leave "english" as an empty string rather than translating yourself.`;

type Chunk = { from: number; to: number; base64: string };

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
  | { ok: true; from: number; to: number; parsed: Omit<ParseResult, "source" | "warnings"> & { warnings?: string[] } }
  | { ok: false; from: number; to: number; error: string };

async function runChunk(chunk: Chunk, availableTopicSlugs: string[]): Promise<ChunkResult> {
  try {
    const client = getAnthropicClient();
    const response = await client.beta.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8000,
      betas: ["pdfs-2024-09-25"],
      system: SYSTEM_PROMPT,
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
              text: `These are pages ${chunk.from} to ${chunk.to} of a scanned textbook. Available topic slugs (use one only if a vocab item is clearly about that topic, otherwise omit topicSlug): ${availableTopicSlugs.join(", ")}`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { ok: false, from: chunk.from, to: chunk.to, error: "Claude returned no text content." };
    }

    const parsed = extractJson<Omit<ParseResult, "source"> & { warnings?: string[] }>(textBlock.text);
    return { ok: true, from: chunk.from, to: chunk.to, parsed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, from: chunk.from, to: chunk.to, error: message };
  }
}

export async function extractScannedPdf(buffer: Buffer, availableTopicSlugs: string[]): Promise<ParseResult> {
  const chunks = await splitIntoChunks(buffer);

  const results: ChunkResult[] = [];
  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map((c) => runChunk(c, availableTopicSlugs)))));
  }

  const vocab: ParsedVocab[] = [];
  const dialogues: ParsedDialogue[] = [];
  const grammarNotes: ParsedGrammarNote[] = [];
  const exercises: ParsedExercise[] = [];
  const warnings: string[] = [];

  for (const result of results) {
    if (!result.ok) {
      warnings.push(`Pages ${result.from}–${result.to} could not be read: ${result.error}`);
      continue;
    }
    const p = result.parsed;
    if (Array.isArray(p.vocab)) vocab.push(...p.vocab);
    if (Array.isArray(p.dialogues)) dialogues.push(...p.dialogues);
    if (Array.isArray(p.grammarNotes)) grammarNotes.push(...p.grammarNotes);
    if (Array.isArray(p.exercises)) exercises.push(...p.exercises);
    if (Array.isArray(p.warnings)) warnings.push(...p.warnings.map((w) => `Pages ${result.from}–${result.to}: ${w}`));
  }

  const missingEnglish = vocab.filter((v) => !v.english).length;
  if (missingEnglish > 0) {
    warnings.push(`${missingEnglish} vocab item(s) had no English gloss on the page — fill these in before confirming.`);
  }

  return { source: "pdf", warnings, vocab, dialogues, grammarNotes, exercises };
}
