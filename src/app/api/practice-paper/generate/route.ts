import { NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/practice-paper";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const topicId = Number(body.topicId);
  if (!topicId) return NextResponse.json({ error: "topicId is required" }, { status: 400 });

  try {
    const paper = await generatePracticePaper(topicId);
    return NextResponse.json(paper);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate a practice paper";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
