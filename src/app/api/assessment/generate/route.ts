import { NextResponse } from "next/server";
import { generateAssessmentTask, type AssessmentTaskType } from "@/lib/assessment";

const VALID_TYPES: AssessmentTaskType[] = ["writing", "speaking_roleplay", "speaking_photocard", "speaking_conversation"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const topicId = Number(body.topicId);
  const type = body.type as AssessmentTaskType;

  if (!topicId || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "topicId and a valid type are required" }, { status: 400 });
  }

  try {
    const task = await generateAssessmentTask(topicId, type);
    return NextResponse.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not generate a task";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
