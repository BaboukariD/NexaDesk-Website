import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";

// A suggestion only — never saved without Djibril seeing and
// confirming it first (see RootNote in schema.prisma). Getting a
// Quranic citation wrong for a hafiz-level reader is a real failure,
// so the prompt is deliberately conservative: it must say so plainly
// if it isn't confident, rather than produce a plausible-sounding
// reference. Snippet length is capped hard, independent of what
// Claude returns, per the brief's "do not reproduce long passages."

export type RootSuggestion = {
  confident: boolean;
  quranRef?: string;
  quranSnippet?: string;
  note?: string;
};

const MAX_SNIPPET_WORDS = 6;

export async function suggestQuranReference(root: string): Promise<RootSuggestion> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 300,
    system: `You help identify one place the Arabic triliteral root given occurs in the Quran, as a short study anchor — not a citation of record. Accuracy matters enormously here: the person using this has memorized the Quran and will notice a wrong reference immediately.

Rules:
- Only answer if you are genuinely confident in both the surah:ayah reference and that the root appears in it. If you have any real doubt, set "confident": false and explain briefly in "note" — do not guess at a plausible-sounding reference.
- "quranSnippet" must be a short fragment only, at most ${MAX_SNIPPET_WORDS} words, containing the root — never a full ayah.
- Output ONLY a JSON object: { "confident": boolean, "quranRef"?: string, "quranSnippet"?: string, "note"?: string }`,
    messages: [{ role: "user", content: `Root: ${root}` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { confident: false, note: "No response." };
  }

  try {
    const parsed = extractJson<RootSuggestion>(textBlock.text);
    if (!parsed.confident) return { confident: false, note: parsed.note };
    const snippet = parsed.quranSnippet?.split(/\s+/).slice(0, MAX_SNIPPET_WORDS).join(" ");
    return { confident: true, quranRef: parsed.quranRef, quranSnippet: snippet };
  } catch {
    return { confident: false, note: "Could not parse a suggestion." };
  }
}
