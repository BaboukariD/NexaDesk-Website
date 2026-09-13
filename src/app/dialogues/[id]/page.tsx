"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Line = {
  id: number;
  order: number;
  speaker: string;
  arabic: string;
  english: string;
  recordings: { id: number; createdAt: string }[];
};
type DialogueDetail = {
  id: number;
  title: string;
  lines: Line[];
  lesson: { number: number; unit: { number: number; book: { title: string } } };
};

const MIME_TYPE = "audio/webm";

// Section P: record his own voice next to the line, play it back.
// Nothing here transcribes or scores it — that would be worse than
// useless. Self-comparison only.
export default function DialoguePage() {
  const { id } = useParams<{ id: string }>();
  const [dialogue, setDialogue] = useState<DialogueDetail | null>(null);
  const [recordingLineId, setRecordingLineId] = useState<number | null>(null);
  const [playbackUrls, setPlaybackUrls] = useState<Record<number, string>>({});
  const [hasRecording, setHasRecording] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    fetch(`/api/dialogues/${id}`)
      .then((r) => r.json())
      .then((d: DialogueDetail) => {
        setDialogue(d);
        const has: Record<number, boolean> = {};
        for (const line of d.lines) has[line.id] = line.recordings.length > 0;
        setHasRecording(has);
      });
  }, [id]);

  async function startRecording(lineId: number) {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: MIME_TYPE });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: MIME_TYPE });
        const url = URL.createObjectURL(blob);
        setPlaybackUrls((prev) => ({ ...prev, [lineId]: url }));

        const base64 = await blobToBase64(blob);
        await fetch(`/api/audio/${lineId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioData: base64, mimeType: MIME_TYPE }),
        });
        setHasRecording((prev) => ({ ...prev, [lineId]: true }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingLineId(lineId);
    } catch {
      setError("Couldn't access the microphone — check the browser's permission for this site.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecordingLineId(null);
  }

  async function play(lineId: number) {
    if (playbackUrls[lineId]) {
      new Audio(playbackUrls[lineId]).play();
      return;
    }
    const res = await fetch(`/api/audio/${lineId}`);
    const data = await res.json();
    if (!data.recording) return;
    const url = `data:${data.recording.mimeType};base64,${data.recording.audioData}`;
    setPlaybackUrls((prev) => ({ ...prev, [lineId]: url }));
    new Audio(url).play();
  }

  if (!dialogue) return null;

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium text-ink">{dialogue.title}</h1>
        <Link href="/dialogues" className="text-sm text-ink-muted underline underline-offset-2">
          Dialogues
        </Link>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {dialogue.lesson.unit.book.title} — unit {dialogue.lesson.unit.number}, lesson {dialogue.lesson.number}
      </p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <ul className="mt-6 flex flex-col gap-6">
        {dialogue.lines.map((line) => (
          <li key={line.id} className="border-b border-line pb-6">
            <p className="text-xs uppercase text-ink-muted">{line.speaker}</p>
            <p className="arabic-text mt-1 text-2xl text-ink" dir="rtl" lang="ar">
              {line.arabic}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{line.english}</p>

            <div className="mt-3 flex items-center gap-3">
              {recordingLineId === line.id ? (
                <button
                  onClick={stopRecording}
                  className="rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => startRecording(line.id)}
                  disabled={recordingLineId !== null}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-ink disabled:opacity-40"
                >
                  Record
                </button>
              )}
              <button
                onClick={() => play(line.id)}
                disabled={!hasRecording[line.id]}
                className="text-sm text-ink-muted underline underline-offset-2 disabled:opacity-40 disabled:no-underline"
              >
                Play back
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
