import type { ParseResult, ParsedVocab } from "./types";

// A small RFC4180-ish parser — handles quoted fields, commas and
// newlines inside quotes, and "" as an escaped quote. No dependency
// pulled in for something this contained.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const KNOWN_COLUMNS = ["arabic", "english", "part_of_speech", "root", "gender", "plural", "notes", "topic"] as const;

/**
 * Expects a header row naming the columns it cares about (order doesn't
 * matter): arabic, english, part_of_speech, root, gender, plural,
 * notes, topic (a topic slug). Only arabic and english are required.
 */
export function parseVocabCsv(text: string): ParseResult {
  const rows = parseCsvRows(text);
  const warnings: string[] = [];

  if (rows.length === 0) {
    return { source: "csv", warnings: ["The file is empty."], vocab: [], dialogues: [], grammarNotes: [], exercises: [] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const columnIndex = (name: string) => header.indexOf(name);

  const arabicIdx = columnIndex("arabic");
  const englishIdx = columnIndex("english");

  if (arabicIdx === -1 || englishIdx === -1) {
    return {
      source: "csv",
      warnings: [`Header row must include "arabic" and "english" columns. Found: ${header.join(", ")}`],
      vocab: [],
      dialogues: [],
      grammarNotes: [],
      exercises: [],
    };
  }

  const unknownColumns = header.filter((h) => h && !KNOWN_COLUMNS.includes(h as (typeof KNOWN_COLUMNS)[number]));
  if (unknownColumns.length > 0) {
    warnings.push(`Ignored unrecognised column(s): ${unknownColumns.join(", ")}`);
  }

  const vocab: ParsedVocab[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const arabic = (r[arabicIdx] ?? "").trim();
    const english = (r[englishIdx] ?? "").trim();
    if (!arabic || !english) {
      warnings.push(`Row ${i + 1}: missing arabic or english, skipped.`);
      continue;
    }
    const get = (name: string) => {
      const idx = columnIndex(name);
      return idx === -1 ? undefined : (r[idx] ?? "").trim() || undefined;
    };
    vocab.push({
      arabic,
      english,
      partOfSpeech: get("part_of_speech"),
      root: get("root"),
      gender: get("gender"),
      plural: get("plural"),
      notes: get("notes"),
      topicSlug: get("topic"),
    });
  }

  return { source: "csv", warnings, vocab, dialogues: [], grammarNotes: [], exercises: [] };
}
