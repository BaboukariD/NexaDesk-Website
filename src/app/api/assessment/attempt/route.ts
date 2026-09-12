import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { markAssessmentAttempt } from "@/lib/assessment";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const taskId = Number(body.taskId);
  const responseText = typeof body.responseText === "string" ? body.responseText.trim() : "";

  if (!taskId || !responseText) {
    return NextResponse.json({ error: "taskId and responseText are required" }, { status: 400 });
  }

  const userId = await getUserId();
  const task = await prisma.assessmentTask.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  try {
    const mark = await markAssessmentAttempt(task, responseText);
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        userId,
        taskId,
        responseText,
        contentScore: mark.contentScore,
        accuracyScore: mark.accuracyScore,
        rangeScore: mark.rangeScore,
        feedback: mark.feedback,
        modelAnswer: mark.modelAnswer,
      },
    });
    return NextResponse.json(attempt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not mark this attempt";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
