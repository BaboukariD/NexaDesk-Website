"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Lesson = { id: number; number: number; section: string; unit: { number: number; book: { title: string } } };

// Section H: "he is in six hours of Arabic class a day and none of it
// reaches the app." Large text, minimal chrome, quick add, one note
// field — built for typing one-handed during a lecture, not for
// browsing.
export default function ClassModePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonId, setLessonId] = useState<string>("");
  const [word, setWord] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then((books) => {
        const flat: Lesson[] = [];
        for (const book of books) {
          for (const unit of book.units) {
            for (const lesson of unit.lessons) {
              flat.push({ id: lesson.id, number: lesson.number, section: lesson.section, unit: { number: unit.number, book: { title: book.title } } });
            }
          }
        }
        setLessons(flat);
      });
  }, []);

  useEffect(() => {
    if (!lessonId) return;
    fetch(`/api/lesson-notes?lessonId=${lessonId}`)
      .then((r) => r.json())
      .then((data) => setNote(data.body ?? ""));
  }, [lessonId]);

  function onNoteChange(value: string) {
    setNote(value);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/lesson-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: Number(lessonId), body: value }),
      });
      setSaved(true);
    }, 800);
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    await fetch("/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arabic: word.trim() }),
    });
    setAdded((prev) => [word.trim(), ...prev]);
    setWord("");
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <div className="flex items-center justify-between">
        <select
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          className="rounded-md border border-line bg-paper px-2 py-1 text-sm text-ink"
        >
          <option value="">Choose a lesson…</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.unit.book.title} — unit {l.unit.number}, lesson {l.number}
            </option>
          ))}
        </select>
        <Link href="/" className="text-sm text-ink-muted underline underline-offset-2">
          Home
        </Link>
      </div>

      <form onSubmit={addWord} className="mt-6">
        <input
          autoFocus
          dir="rtl"
          lang="ar"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="اكتب هنا"
          className="arabic-text w-full rounded-md border border-line bg-paper px-3 py-4 text-3xl text-ink outline-none focus:border-accent"
        />
        <button type="submit" className="mt-3 w-full rounded-md bg-ink px-4 py-3 text-base font-medium text-paper">
          Add
        </button>
      </form>

      {added.length > 0 && (
        <div className="arabic-text mt-4 flex flex-wrap gap-2 text-lg text-ink-muted" lang="ar">
          {added.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      )}

      {lessonId && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <p className="text-xs uppercase text-ink-muted">Notes</p>
            <p className="text-xs text-ink-muted">{saved ? "Saved" : "Saving…"}</p>
          </div>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={10}
            className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </div>
      )}
    </main>
  );
}
