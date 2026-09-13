import { getAnthropicClient, DEFAULT_MODEL, extractJson } from "@/lib/anthropic";

/** Section F: "auto-glossing fills the rest." One short, honest gloss — not a full dictionary entry. */
export async function autoGloss(arabic: string): Promise<{ english: string; root?: string; gender?: string }> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 200,
    system: `Give the most likely English gloss for this Arabic word or short phrase, plus its triliteral root and gender if it's a noun and both are unambiguous. If you're not reasonably confident of the word itself (it looks garbled or ambiguous), say so in "english" rather than guessing. Output ONLY JSON: { "english": string, "root"?: string, "gender"?: "m"|"f" }`,
    messages: [{ role: "user", content: arabic }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");
  return extractJson(textBlock.text);
}
