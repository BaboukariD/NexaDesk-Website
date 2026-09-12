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

export type ParseResult = {
  source: "csv" | "text";
  warnings: string[];
  vocab: ParsedVocab[];
  dialogues: ParsedDialogue[];
  grammarNotes: ParsedGrammarNote[];
};
