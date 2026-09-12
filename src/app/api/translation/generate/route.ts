import { NextResponse } from "next/server";
import { generateTranslationTask, type Direction } from "@/lib/translation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const topicId = Number(body.topicId);
  const direction = body.direction as Direction;

  if (!topicId || (direction !== "en_to_ar" && direction !== "ar_to_en")) {
    return NextResponse.json({ error: "topicId and a valid direction are required" }, { status: 400 });
  }

  try {
    const task = await generateTranslationTask(topicId, direction);
    return NextResponse.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate a translation task";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
