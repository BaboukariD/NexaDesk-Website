"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { upload } from "@vercel/blob/client";

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

// Vercel Functions hard-cap the request body at 4.5 MB (not
// configurable, not raisable by code) — a payload over that never
// even reaches /api/upload/parse if sent as a normal form upload.
// Below this, upload directly as multipart form data (one request,
// simplest path, already proven). At or above it, go through Vercel
// Blob instead: the browser uploads the bytes straight to storage
// (see /api/upload/blob-token), sidestepping the function body limit
// entirely, and this page then hands /api/upload/parse just the blob
// URL. ABSOLUTE_MAX_BYTES is the overall ceiling either way — past
// that this is closer to "a whole book" than "a lesson page," which
// is what the ingestion pipeline is actually built for.
const DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const ABSOLUTE_MAX_BYTES = 10 * 1024 * 1024;

// Reads the server's newline-delimited progress stream for a scanned
// PDF's vision extraction (see streamVisionExtraction in
// src/app/api/upload/parse/route.ts). A stream chunk can split a JSON
// line across two reads, so partial lines are buffered until a
// newline actually arrives rather than parsed as soon as bytes show up.
async function readVisionStream(
  res: Response,
  setProgress: (p: { completed: number; total: number } | null) => void,
  setResult: (r: ParseResult) => void,
  fail: (error: string) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) {
    fail("Server response had no body to read.");
    return;
  }
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event.type === "progress") {
        setProgress({ completed: event.completed as number, total: event.total as number });
      } else if (event.type === "done") {
        sawDone = true;
        setResult(event.result as ParseResult);
      } else if (event.type === "error") {
        sawDone = true;
        fail((event.error as string) ?? "Something went wrong reading this PDF.");
      }
    }
  }

  if (!sawDone) {
    fail("The connection closed before this file finished processing. Try again.");
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default function UploadPage() {
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
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
  const [committed, setCommitted] = useState<{ vocabCreated: number; vocabMerged: number; dialoguesCreated: number; notesCreated: number; exercisesCreated: number } | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/books").then((r) => r.json()).then(setBooks);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setProgress(null);
    setResult(null);
    setCommitted(null);
    setFileName(file.name);

    const fail = (error: string) =>
      setResult({ source: "", warnings: [], vocab: [], dialogues: [], grammarNotes: [], exercises: [], error });

    if (file.size > ABSOLUTE_MAX_BYTES) {
      setParsing(false);
      fail(
        `This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — uploads are capped at 10MB. Upload one page at a time as a photo, or split a multi-page PDF, rather than a whole book.`
      );
      return;
    }

    try {
      const res =
        file.size > DIRECT_UPLOAD_MAX_BYTES
          ? await parseViaBlob(file)
          : await parseDirect(file);

      // A scanned PDF's page-by-page vision extraction always responds
      // 200 and streams one JSON event per line instead of a single
      // response body, so a full book shows real progress instead of a
      // frozen "Parsing…" for however many minutes it takes. Every other
      // path returns a normal JSON response, success or failure alike.
      if ((res.headers.get("content-type") ?? "").includes("application/x-ndjson")) {
        await readVisionStream(res, setProgress, setResult, fail);
        return;
      }

      let data: { error?: string } & Record<string, unknown>;
      try {
        data = await res.json();
      } catch {
        fail(
          res.status === 413
            ? "This file is too large for the server to accept — upload one page at a time as a photo, or split a multi-page PDF."
            : `Server returned an unexpected response (status ${res.status}). Try again, or try a smaller file.`
        );
        return;
      }
      if (!res.ok) {
        fail(data.error ?? `Upload failed (status ${res.status}).`);
      } else {
        setResult(data as ParseResult);
      }
    } catch (err) {
      fail(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't reach the server — check your connection and try again."
      );
    } finally {
      setParsing(false);
      setProgress(null);
    }
  }, []);

  async function parseDirect(file: File): Promise<Response> {
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/upload/parse", { method: "POST", body: form });
  }

  async function parseViaBlob(file: File): Promise<Response> {
    // The Blob client SDK retries transient failures internally and
    // doesn't reliably surface a fetch that's blocked at the network
    // layer (a CSP violation looks identical to a dropped connection
    // to it) — without this, that class of failure hangs the "Parsing…"
    // state forever instead of ever reaching the catch block below.
    const blob = await withTimeout(
      upload(file.name, file, { access: "private", handleUploadUrl: "/api/upload/blob-token" }),
      90_000,
      "The upload timed out — check your connection and try again."
    );
    return fetch("/api/upload/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blobPathname: blob.pathname, blobUrl: blob.url, fileName: file.name }),
    });
  }

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
    setCommitError(null);
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
      } else {
        setCommitError(data.error ?? "Couldn't save this lesson — try again.");
      }
    } catch {
      setCommitError("Couldn't reach the server — check your connection.");
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
        Plain text, CSV, PDF, and page photographs — one lesson or a
        whole book at a time, under 10MB. A PDF whose text layer looks
        shaped, reordered, or garbled (a scanned book, usually) is read
        as page images by Claude instead of trusting that text — same
        as a photo, just automatic and page by page, so a full scan can
        take a few minutes rather than seconds. Photos are always read
        this way, not standard OCR, since standard OCR fails badly on
        vowelled Arabic.
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
            accept=".txt,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {parsing
            ? progress
              ? `Reading page ${progress.completed} of ${progress.total}…`
              : "Parsing…"
            : "Drop a file here, or click to choose one (.txt, .csv, .pdf, or a page photo)"}
          {progress && (
            <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%` }}
              />
            </div>
          )}
        </label>
      )}

      {result?.error && <p className="mt-6 text-sm text-error">{result.error}</p>}

      {committed && (
        <div className="mt-8 rounded-md border border-accent bg-accent-muted p-4 text-sm text-ink">
          <p>Added from {fileName}:</p>
          <ul className="mt-1 list-inside list-disc">
            <li>{committed.vocabCreated} new vocabulary item(s)</li>
            {committed.vocabMerged > 0 && (
              <li>{committed.vocabMerged} already known — new source recorded, not duplicated</li>
            )}
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
          {commitError && <p className="mt-2 text-sm text-error">{commitError}</p>}
        </div>
      )}
    </main>
  );
}
