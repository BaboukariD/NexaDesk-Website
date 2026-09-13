// Grammar production drills generated mechanically from vocabulary
// already in the database — no API call, so they cost nothing to
// serve endlessly (section L). Every rule here is restricted to the
// regular case it's certain about and skips anything irregular,
// rather than risk generating wrong Arabic with false confidence —
// the same standard applied everywhere else in this app.

const DIACRITICS = /[ً-ْـٰ]/g;
function stripDiacritics(s: string): string {
  return s.replace(DIACRITICS, "").trim();
}

export type PersonSuffix = { person: string; label: string; suffix: string };

// Regular attachment only: strip the noun's ta-marbuta or trailing
// consonant and append the suffix. Skipped entirely for nouns ending
// in alef, waw, ya, or hamza — those have irregular attachment rules
// this doesn't attempt.
const POSSESSIVE_SUFFIXES: PersonSuffix[] = [
  { person: "my", label: "my", suffix: "ي" },
  { person: "his", label: "his", suffix: "ه" },
  { person: "her", label: "her", suffix: "ها" },
  { person: "our", label: "our", suffix: "نا" },
  { person: "your_pl", label: "your (pl.)", suffix: "كم" },
  { person: "their", label: "their", suffix: "هم" },
];

const IRREGULAR_ENDINGS = ["ا", "و", "ي", "ء", "ى", "آ"];

export function canTakePossessiveSuffix(arabicVowelled: string): boolean {
  const stripped = stripDiacritics(arabicVowelled);
  const last = stripped.slice(-1);
  return stripped.length > 1 && !IRREGULAR_ENDINGS.includes(last);
}

export function attachPossessiveSuffix(arabicVowelled: string, suffix: string): string {
  const stripped = stripDiacritics(arabicVowelled);
  if (stripped.endsWith("ة")) {
    return stripped.slice(0, -1) + "ت" + suffix;
  }
  return stripped + suffix;
}

const VERB_PREFIXES: PersonSuffix[] = [
  { person: "i", label: "I", suffix: "أ" },
  { person: "you_she", label: "you (m.) / she", suffix: "ت" },
  { person: "we", label: "we", suffix: "ن" },
  { person: "he", label: "he", suffix: "ي" },
];

/** Only present-tense Form I verbs written in their dictionary (هو) form, i.e. ي-prefixed. */
export function looksLikePresentTenseVerb(arabicVowelled: string, partOfSpeech?: string | null): boolean {
  const stripped = stripDiacritics(arabicVowelled);
  if (!stripped.startsWith("ي") || stripped.length < 3) return false;
  if (partOfSpeech && !/verb/i.test(partOfSpeech)) return false;
  return true;
}

export function swapVerbPrefix(arabicVowelled: string, newPrefix: string): string {
  const stripped = stripDiacritics(arabicVowelled);
  return newPrefix + stripped.slice(1);
}

export { POSSESSIVE_SUFFIXES, VERB_PREFIXES };

// A small curated list of adjectives whose feminine is the regular
// +ة pattern, verified rather than derived — the risk of silently
// producing a wrong feminine form (colour and elative adjectives are
// irregular: أحمر/حمراء, not أحمرة) isn't worth taking for arbitrary
// adjectives.
export const REGULAR_ADJECTIVES: { m: string; f: string; en: string }[] = [
  { m: "كَبِيرٌ", f: "كَبِيرَةٌ", en: "big" },
  { m: "صَغِيرٌ", f: "صَغِيرَةٌ", en: "small" },
  { m: "جَمِيلٌ", f: "جَمِيلَةٌ", en: "beautiful" },
  { m: "طَوِيلٌ", f: "طَوِيلَةٌ", en: "tall / long" },
  { m: "قَصِيرٌ", f: "قَصِيرَةٌ", en: "short" },
  { m: "جَدِيدٌ", f: "جَدِيدَةٌ", en: "new" },
  { m: "قَدِيمٌ", f: "قَدِيمَةٌ", en: "old" },
  { m: "لَذِيذٌ", f: "لَذِيذَةٌ", en: "delicious" },
  { m: "بَارِدٌ", f: "بَارِدَةٌ", en: "cold" },
  { m: "سَهْلٌ", f: "سَهْلَةٌ", en: "easy" },
  { m: "صَعْبٌ", f: "صَعْبَةٌ", en: "difficult" },
];
