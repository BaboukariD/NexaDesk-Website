// The shape every ingestion path (CSV, plain text, later PDF and photo)
// normalises to. This is what gets shown for confirmation before
// anything is written to the database — see section 3 of the brief:
// "never silently ingest a bad parse."

export type ParsedVocab = {
  arabic: string; // vowelled
  english: string;
  partOfSpeech?: string;
  root?: string;
  gender?: string;
  plural?: string;
  notes?: string;
  topicSlug?: string;
};

export type ParsedDialogueLine = {
  order: number;
  speaker: string;
  arabic: string;
  english: string;
};

export type ParsedDialogue = {
  title: string;
  lines: ParsedDialogueLine[];
};

export type ParsedGrammarNote = {
  title: string;
  bodyAr: string;
  bodyEn: string;
};

// Only maa_or_min and possessive_suffix need curated source examples —
// the other drill types are generated on the fly from vocab/dialogues
// (see src/lib/drills.ts) since generating fresh grammar content risks
// producing something subtly wrong for a hafiz-level learner to catch.
export type ParsedExercise = {
  type: "maa_or_min" | "possessive_suffix" | "fill_gap" | "true_false";
  prompt: string;
  answer: string;
  options?: string[];
};

export type ParseResult = {
  source: "csv" | "text";
  warnings: string[];
  vocab: ParsedVocab[];
  dialogues: ParsedDialogue[];
  grammarNotes: ParsedGrammarNote[];
  exercises: ParsedExercise[];
};
