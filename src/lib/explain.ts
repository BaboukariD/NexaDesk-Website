import { prisma } from "@/lib/prisma";
import { getAnthropicClient, DEFAULT_MODEL } from "@/lib/anthropic";
import { detectPatternKeys, type AttemptContext } from "@/lib/error-patterns";

/**
 * Section M: one line naming the specific error, not a rule dump.
 * Cached per error TYPE (the ErrorPattern row), not per attempt — "the
 * same wrong answer to the same question should never cost a second
 * API call" is actually a weaker guarantee than what this gives: every
 * future instance of the same pattern reuses one cached line, forever.
 *
 * Only wrong answers that match one of the six known patterns get an
 * explanation this way. An answer that matches none of them doesn't
 * have a "type" to cache against, so there's nothing to call this
 * with — the drill UI simply has no Explain button in that case.
 */
export async function explainError(userId: number, ctx: AttemptContext): Promise<string | null> {
  const keys = detectPatternKeys(ctx);
  if (keys.length === 0) return null;

  const pattern = await prisma.errorPattern.findUnique({
    where: { userId_key: { userId, key: keys[0] } },
  });
  if (!pattern) return null;
  if (pattern.explanation) return pattern.explanation;

  // The seeded descriptions are already written in exactly this
  // one-line, name-the-error style ("ت is you or she, أ is I") — no
  // need to spend an API call regenerating what's already there.
  if (pattern.description) {
    await prisma.errorPattern.update({ where: { id: pattern.id }, data: { explanation: pattern.description } });
    return pattern.description;
  }

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 150,
    system: `Explain one specific Arabic grammar/vocabulary error in exactly one sentence. Name the specific error, do not restate the whole rule, no praise, no em dashes. Example style: "ت is you or she, أ is I." Output the sentence only, nothing else.`,
    messages: [
      {
        role: "user",
        content: `Error pattern: ${pattern.description}\nExpected: ${ctx.expectedArabic}\nHe wrote: ${ctx.userAnswer}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const explanation = textBlock && textBlock.type === "text" ? textBlock.text.trim() : pattern.description;

  await prisma.errorPattern.update({ where: { id: pattern.id }, data: { explanation } });
  return explanation;
}
