// Section D: "he follows a fixed daily plan with named blocks... open
// on what he is meant to be doing, not a menu." The brief gives two
// concrete anchors (Monday morning -> Block A, vocabulary intake;
// Sunday -> cold recall) and no full weekly spec beyond that, so this
// is a reasonable default filling the rest in — meant to be edited
// here once Djibril's actual fixed plan is known, not treated as
// definitive. One block per day for now: the brief also implies
// multiple time-of-day blocks ("Monday morning: Block A"), but without
// a specified afternoon/evening schedule that would be invented detail
// rather than a real fixed plan, so it's left for whenever the actual
// full schedule is provided.

export type DailyBlock = {
  name: string;
  activity: string;
  route: string;
};

const WEEKLY_PLAN: Record<number, DailyBlock> = {
  0: { name: "Cold recall", activity: "Everything from this week, from memory, no hints", route: "/cold-recall" }, // Sunday
  1: { name: "Block A", activity: "Vocabulary intake", route: "/vocab" },
  2: { name: "Block B", activity: "Drill", route: "/drills" },
  3: { name: "Block C", activity: "Flashcard review", route: "/flashcards" },
  4: { name: "Block D", activity: "Sentence builder & grammar drills", route: "/drills" },
  5: { name: "Block E", activity: "Sticky words", route: "/sticky-words" },
  6: { name: "Block F", activity: "Writing / speaking practice", route: "/assessment" },
};

export function getTodaysBlock(date: Date = new Date()): DailyBlock {
  return WEEKLY_PLAN[date.getDay()];
}
