import type { Prisma, PrismaClient } from "@prisma/client";
import { toSkeleton, skeletonsMatch } from "@/lib/normalize";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Detectors for the six error patterns seeded in prisma/seed.mjs
 * (section 5.3). Each takes the context of one WRONG drill attempt and
 * returns the pattern keys it looks like an instance of — usually
 * zero or one, occasionally more than one.
 *
 * These are heuristics, not a parser. Two are worth flagging as
 * limitations up front:
 *   - feminine_default is a generic "added a gender ending that isn't
 *     there" detector, not scoped to self-description specifically —
 *     the schema has no way to know a sentence is about the speaker.
 *   - possessive_suffix_pressure only fires when the answer was typed
 *     in Arabic script, because the ه/ها distinction is exactly the
 *     kind of short-vowel difference the normalizer deliberately
 *     treats as soft everywhere else (see normalize.ts) — comparing
 *     the raw trailing letters is the only way to tell them apart.
 */

export type AttemptContext = {
  expectedArabic: string;
  userAnswer: string;
  englishGloss?: string;
};

const WH_WORDS: [string, string][] = [["ماذا", "أين"]];

const CONFUSION_GROUPS: string[][] = [["شركة", "الشارقة", "بلد"]];

const STICKY_WORDS = ["فندق", "مركز", "أشخاص", "معلم", "يتحدث", "متى", "بعض", "بعد"];

const POSSESSIVE_SUFFIXES = ["كم", "هن", "هم", "ها", "نا", "ه", "ك", "ي"];

function stripDiacritics(s: string): string {
  return s.replace(/[ً-ْـٰ]/g, "");
}

function detectWhWordConfusion(ctx: AttemptContext): boolean {
  const expectedSkel = toSkeleton(ctx.expectedArabic);
  const userSkel = toSkeleton(ctx.userAnswer);
  return WH_WORDS.some(([a, b]) => {
    const skelA = toSkeleton(a);
    const skelB = toSkeleton(b);
    return (
      (skeletonsMatch(expectedSkel, skelA) && skeletonsMatch(userSkel, skelB)) ||
      (skeletonsMatch(expectedSkel, skelB) && skeletonsMatch(userSkel, skelA))
    );
  });
}

function detectVerbPrefixConfusion(ctx: AttemptContext): boolean {
  if (!ctx.englishGloss?.toLowerCase().trim().startsWith("i ")) return false;
  const expected = stripDiacritics(ctx.expectedArabic).trim();
  const startsWithHamza = /^[أإآء]/.test(expected);
  if (!startsWithHamza) return false;
  const userRaw = ctx.userAnswer.trim().toLowerCase();
  return userRaw.startsWith("t") || userRaw.startsWith("ت");
}

function detectFeminineDefault(ctx: AttemptContext): boolean {
  const expectedSkel = toSkeleton(ctx.expectedArabic);
  const userSkel = toSkeleton(ctx.userAnswer);
  // A trailing "t" token is what a ة/ta-marbuta (or a transliterated
  // "-a"/"-ah"/"-at") reduces to. If removing it from just the user's
  // side makes the skeletons match, they added a feminine ending that
  // isn't in the reference answer.
  return expectedSkel !== "" && userSkel.replace(/-?t$/, "") === expectedSkel && userSkel !== expectedSkel;
}

function detectWordGroupConfusion(ctx: AttemptContext): boolean {
  const expectedSkel = toSkeleton(ctx.expectedArabic);
  const userSkel = toSkeleton(ctx.userAnswer);
  return CONFUSION_GROUPS.some((group) => {
    const skeletons = group.map(toSkeleton);
    const expectedIdx = skeletons.findIndex((s) => skeletonsMatch(s, expectedSkel));
    if (expectedIdx === -1) return false;
    return skeletons.some((s, i) => i !== expectedIdx && skeletonsMatch(s, userSkel));
  });
}

function detectPossessiveSuffixConfusion(ctx: AttemptContext): boolean {
  const expected = stripDiacritics(ctx.expectedArabic).trim();
  const userAnswer = stripDiacritics(ctx.userAnswer).trim();
  if (!/[؀-ۿ]/.test(userAnswer)) return false; // Arabic script only, see module comment

  const findSuffix = (word: string) => POSSESSIVE_SUFFIXES.find((s) => word.endsWith(s)) ?? null;
  const expectedSuffix = findSuffix(expected);
  const userSuffix = findSuffix(userAnswer);
  if (!expectedSuffix || !userSuffix || expectedSuffix === userSuffix) return false;

  const expectedStem = expected.slice(0, -expectedSuffix.length);
  const userStem = userAnswer.slice(0, -userSuffix.length);
  return toSkeleton(expectedStem) === toSkeleton(userStem);
}

function detectStickyVocabulary(ctx: AttemptContext): boolean {
  const expectedSkel = toSkeleton(ctx.expectedArabic);
  return STICKY_WORDS.some((w) => toSkeleton(w) === expectedSkel);
}

const DETECTORS: [string, (ctx: AttemptContext) => boolean][] = [
  ["maadha_vs_ayna", detectWhWordConfusion],
  ["verb_prefix", detectVerbPrefixConfusion],
  ["feminine_default", detectFeminineDefault],
  ["sharika_sharjah_balad", detectWordGroupConfusion],
  ["possessive_suffix_pressure", detectPossessiveSuffixConfusion],
  ["sticky_vocabulary", detectStickyVocabulary],
];

export function detectPatternKeys(ctx: AttemptContext): string[] {
  return DETECTORS.filter(([, fn]) => fn(ctx)).map(([key]) => key);
}

// "10 spaced attempts" per the brief — this checks the last 10
// attempts against the exact same expected answer, however close
// together they fall. It doesn't separately enforce that they're
// spread across sessions/days; in practice the FSRS-scheduled and
// weighted-drill selection already keeps repeats from bunching up.
const RETIREMENT_WINDOW = 10;
const RETIREMENT_THRESHOLD = 0.9;

/**
 * Called after every graded drill attempt (correct or not). On a wrong
 * answer, bumps the frequency of every pattern it matches. Either way,
 * checks whether patterns tied to this exact expected answer have
 * quietly gotten good enough to retire from the priority queue.
 */
export async function recordAttemptForErrorModel(db: Db, userId: number, ctx: AttemptContext, correct: boolean): Promise<void> {
  if (!correct) {
    const matchedKeys = detectPatternKeys(ctx);
    for (const key of matchedKeys) {
      const pattern = await db.errorPattern.findUnique({ where: { userId_key: { userId, key } } });
      if (!pattern) continue;
      const examples: string[] = JSON.parse(pattern.exampleItems);
      if (!examples.includes(ctx.expectedArabic)) examples.push(ctx.expectedArabic);
      await db.errorPattern.update({
        where: { id: pattern.id },
        data: {
          frequency: pattern.frequency + 1,
          lastSeen: new Date(),
          exampleItems: JSON.stringify(examples.slice(-10)),
          retired: false, // a recurrence un-retires it
        },
      });
    }
  }

  // Retirement check: for every active pattern whose examples include
  // this exact expected answer, look at the last RETIREMENT_WINDOW
  // attempts made specifically against that answer (via the stored
  // expectedAnswer, not just recent attempts generally — accuracy on
  // everything else says nothing about whether this particular
  // confusion is resolved) and retire if accuracy clears the bar.
  const candidatePatterns = await db.errorPattern.findMany({ where: { userId, retired: false } });
  const relevant = candidatePatterns.filter((p) => {
    const examples: string[] = JSON.parse(p.exampleItems);
    return examples.includes(ctx.expectedArabic);
  });
  if (relevant.length === 0) return;

  const recentAttempts = await db.attempt.findMany({
    where: { userId, expectedAnswer: ctx.expectedArabic },
    orderBy: { createdAt: "desc" },
    take: RETIREMENT_WINDOW,
  });
  if (recentAttempts.length < RETIREMENT_WINDOW) return;
  const accuracy = recentAttempts.filter((a) => a.correct).length / recentAttempts.length;
  if (accuracy < RETIREMENT_THRESHOLD) return;

  for (const pattern of relevant) {
    await db.errorPattern.update({ where: { id: pattern.id }, data: { retired: true } });
  }
}
