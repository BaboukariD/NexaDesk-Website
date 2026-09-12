import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to use upload parsing, drill generation, or answer marking."
    );
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

/**
 * Claude is asked to return JSON, but models sometimes wrap it in a
 * markdown code fence or add a sentence before/after despite
 * instructions not to. This pulls the first well-formed JSON object or
 * array out of whatever text came back rather than failing outright.
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // fall through to a more forgiving extraction below
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim()) as T;
  }

  const start = trimmed.search(/[[{]/);
  const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  }

  throw new Error("Claude did not return valid JSON.");
}
