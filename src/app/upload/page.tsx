"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ParsedVocab = {
  arabic: string;
  english: string;
  partOfSpeech?: string;
  root?: string;
  gender?: string;
  plural?: string;
  notes?: string;
  topicSlug?: string;
};
type ParsedDialogueLine = { order: number; speaker: string; arabic: string; english: string };
type ParsedDialogue = { title: string; lines: ParsedDialogueLine[] };
type ParsedGrammarNote = { title: string; bodyAr: string; bodyEn: string };
type ParseResult = {
  source: string;
  warnings: string[];
  vocab: ParsedVocab[];
  dialogues: ParsedDialogue[];
  grammarNotes: ParsedGrammarNote[];
  exercises: unknown[];
  error?: string;
};

type Lesson = { id: number; number: number; section: string };
type Unit = { id: number; number: number; titleEn: string; titleAr: string; lessons: Lesson[] };
type Book = { id: number; title: string; units: Unit[] };

export default function UploadPage() {
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [books, setBooks] = useState<Book[]>([]);

  const [destMode, setDestMode] = useState<"existing" | "new">("new");
  const [existingLessonId, setExistingLessonId] = useState<number | null>(null);
  const [newBook, setNewBook] = useState({
    bookTitle: "",
    bookTitleAr: "",
    unitNumber: 1,
    unitTitleAr: "",
    unitTitleEn: "",
    lessonNumber: 1,
    lessonSection: "reading",
  });

  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<{ vocabCreated: number; dialoguesCreated: number; notesCreated: number; exercisesCreated: number } | null>(null);

  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then(setBooks);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setResult(null);
    setCommitted(null);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setResult({ source: "", warnings: [], vocab: [], dialogues: [], grammarNotes: [], exercises: [], error: data.error });
      } else {
        setResult(data);
      }
    } finally {
      setParsing(false);
    }
  }, []);

  function updateVocab(i: number, field: keyof ParsedVocab, value: string) {
    if (!result) return;
    const vocab = [...result.vocab];
    vocab[i] = { ...vocab[i], [field]: value };
    setResult({ ...result, vocab });
  }

  function removeVocab(i: number) {
    if (!result) return;
    setResult({ ...result, vocab: result.vocab.filter((_, idx) => idx !== i) });
  }

  async function handleCommit() {
    if (!result) return;
    setCommitting(true);
    try {
      const destination =
        destMode === "existing"
          ? { mode: "existing", lessonId: existingLessonId }
          : { mode: "new", ...newBook };

      const res = await fetch("/api/upload/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, vocab: result.vocab, dialogues: result.dialogues, grammarNotes: result.grammarNotes, exercises: result.exercises }),
      });
      const data = await res.json();
      if (res.ok) {
        setCommitted(data);
        setResult(null);
      }
    } finally {
      setCommitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">Upload</h1>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Plain text and CSV for now. PDF and photo pages come later.
      </p>

      {!result && !committed && (
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className="mt-8 flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-line text-sm text-ink-muted"
        >
          <input
            type="file"
            accept=".txt,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parsing ? "Parsing…" : "Drop a .txt or .csv file here, or click to choose one"}
        </label>
      )}

      {result?.error && <p className="mt-6 text-sm text-error">{result.error}</p>}

      {committed && (
        <div className="mt-8 rounded-md border border-accent bg-accent-muted p-4 text-sm text-ink">
          <p>Added from {fileName}:</p>
          <ul className="mt-1 list-inside list-disc">
            <li>{committed.vocabCreated} vocabulary item(s)</li>
            <li>{committed.dialoguesCreated} dialogue(s)</li>
            <li>{committed.notesCreated} grammar note(s)</li>
            <li>{committed.exercisesCreated} exercise(s)</li>
          </ul>
          <button onClick={() => setCommitted(null)} className="mt-3 text-sm underline underline-offset-2">
            Upload another file
          </button>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-8">
          {result.warnings.length > 0 && (
            <ul className="rounded-md border border-error bg-error-muted p-3 text-sm text-error">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 text-sm font-medium text-ink">
            Vocabulary ({result.vocab.length}) — check before confirming
          </h2>
          <div className="mt-2 space-y-2">
            {result.vocab.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-b border-line pb-2">
                <input
                  dir="rtl"
                  lang="ar"
                  value={v.arabic}
                  onChange={(e) => updateVocab(i, "arabic", e.target.value)}
                  className="arabic-text rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
                />
                <input
                  value={v.english}
                  onChange={(e) => updateVocab(i, "english", e.target.value)}
                  className="rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
                />
                <button onClick={() => removeVocab(i)} className="text-xs text-ink-muted underline underline-offset-2">
                  Remove
                </button>
              </div>
            ))}
            {result.vocab.length === 0 && <p className="text-sm text-ink-muted">No vocabulary found.</p>}
          </div>

          {result.dialogues.length > 0 && (
            <>
              <h2 className="mt-8 text-sm font-medium text-ink">Dialogues ({result.dialogues.length})</h2>
              {result.dialogues.map((d, i) => (
                <div key={i} className="mt-2 rounded-md border border-line p-3">
                  <p className="text-sm font-medium text-ink">{d.title}</p>
                  {d.lines.map((line, j) => (
                    <p key={j} className="mt-1 text-sm text-ink-muted">
                      <span className="text-ink">{line.speaker}:</span>{" "}
                      <span className="arabic-text" lang="ar">{line.arabic}</span> — {line.english}
                    </p>
                  ))}
                </div>
              ))}
            </>
          )}

          <h2 className="mt-8 text-sm font-medium text-ink">Add to</h2>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={destMode === "new"} onChange={() => setDestMode("new")} />
              New book/unit/lesson
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={destMode === "existing"} onChange={() => setDestMode("existing")} />
              Existing lesson
            </label>
          </div>

          {destMode === "new" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input
                placeholder="Book title"
                value={newBook.bookTitle}
                onChange={(e) => setNewBook({ ...newBook, bookTitle: e.target.value })}
                className="rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
              />
              <input
                placeholder="Unit title (English)"
                value={newBook.unitTitleEn}
                onChange={(e) => setNewBook({ ...newBook, unitTitleEn: e.target.value })}
                className="rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
              />
              <input
                dir="rtl"
                lang="ar"
                placeholder="عنوان الوحدة"
                value={newBook.unitTitleAr}
                onChange={(e) => setNewBook({ ...newBook, unitTitleAr: e.target.value })}
                className="arabic-text rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
              />
              <select
                value={newBook.lessonSection}
                onChange={(e) => setNewBook({ ...newBook, lessonSection: e.target.value })}
                className="rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
              >
                <option value="sounds">sounds (الأصوات وفهم المسموع)</option>
                <option value="reading">reading (القراءة)</option>
                <option value="writing">writing (الكتابة)</option>
                <option value="speaking">speaking (التحدث)</option>
              </select>
            </div>
          ) : (
            <select
              value={existingLessonId ?? ""}
              onChange={(e) => setExistingLessonId(Number(e.target.value))}
              className="mt-3 w-full rounded-md border border-line bg-paper px-2 py-1 text-ink outline-none focus:border-accent"
            >
              <option value="">Choose a lesson…</option>
              {books.map((book) =>
                book.units.map((unit) =>
                  unit.lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {book.title} → Unit {unit.number} → Lesson {lesson.number} ({lesson.section})
                    </option>
                  ))
                )
              )}
            </select>
          )}

          <button
            onClick={handleCommit}
            disabled={committing || (destMode === "new" && !newBook.bookTitle) || (destMode === "existing" && !existingLessonId)}
            className="mt-6 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
          >
            {committing ? "Adding…" : "Confirm and add"}
          </button>
        </div>
      )}
    </main>
  );
}
