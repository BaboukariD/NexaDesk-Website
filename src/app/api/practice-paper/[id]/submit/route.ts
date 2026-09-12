import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { submitPracticePaper } from "@/lib/practice-paper";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const paperId = Number(id);
  const body = await req.json().catch(() => ({}));
  const userId = await getUserId();

  try {
    const result = await submitPracticePaper(paperId, userId, {
      listeningAnswers: Array.isArray(body.listeningAnswers) ? body.listeningAnswers : [],
      readingAnswers: Array.isArray(body.readingAnswers) ? body.readingAnswers : [],
      writingResponseText: typeof body.writingResponseText === "string" ? body.writingResponseText : "",
      translationAnswers: Array.isArray(body.translationAnswers) ? body.translationAnswers : [],
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 0,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not mark this paper";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
