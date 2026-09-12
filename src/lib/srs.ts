import { fsrs, createEmptyCard, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { ReviewState } from "@prisma/client";

// A single shared scheduler with the library's own default parameters —
// per the brief, we do not invent our own algorithm or tune its weights.
const scheduler = fsrs();

export { Rating };
export type { Grade };

const STATE_NAMES = ["New", "Learning", "Review", "Relearning"] as const;

function stateToName(state: State): (typeof STATE_NAMES)[number] {
  return STATE_NAMES[state];
}

function nameToState(name: string): State {
  const index = STATE_NAMES.indexOf(name as (typeof STATE_NAMES)[number]);
  return index === -1 ? State.New : (index as State);
}

/** The fields new ReviewState rows are created with, before their first review. */
export function emptyReviewStateFields(now: Date = new Date()) {
  const card = createEmptyCard(now);
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: stateToName(card.state),
    lastReview: card.last_review ?? null,
  };
}

function toCard(row: ReviewState): Card {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.lastReview
      ? Math.max(0, (Date.now() - row.lastReview.getTime()) / 86_400_000)
      : 0,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: nameToState(row.state),
    last_review: row.lastReview ?? undefined,
  };
}

/**
 * Grades a review and returns the fields to persist back onto the
 * ReviewState row, plus the human-readable interval the library chose
 * (for feedback like "next review in 4 days").
 */
export function grade(row: ReviewState, rating: Grade, now: Date = new Date()) {
  const card = toCard(row);
  const { card: next } = scheduler.next(card, now, rating);
  return {
    fields: {
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      scheduledDays: next.scheduled_days,
      learningSteps: next.learning_steps,
      reps: next.reps,
      lapses: next.lapses,
      state: stateToName(next.state),
      lastReview: next.last_review ?? now,
    },
    scheduledDays: next.scheduled_days,
  };
}
