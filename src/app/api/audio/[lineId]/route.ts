import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

// Section P: record and play back, nothing else. No transcription, no
// scoring — this only ever stores and returns his own audio.

export async function GET(_req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const userId = await getUserId();

  const recording = await prisma.audioRecording.findFirst({
    where: { dialogueLineId: Number(lineId), userId },
    orderBy: { createdAt: "desc" },
  });
  if (!recording) return NextResponse.json({ recording: null });
  return NextResponse.json({
    recording: { id: recording.id, createdAt: recording.createdAt, mimeType: recording.mimeType, audioData: recording.audioData },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const body = await req.json().catch(() => ({}));
  const audioData = typeof body.audioData === "string" ? body.audioData : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  if (!audioData || !mimeType) {
    return NextResponse.json({ error: "audioData and mimeType are required" }, { status: 400 });
  }

  const userId = await getUserId();
  const dialogueLineId = Number(lineId);

  // Keep only the latest take per line — a history of every retry
  // isn't useful for self-comparison and would grow without bound.
  await prisma.audioRecording.deleteMany({ where: { dialogueLineId, userId } });
  const recording = await prisma.audioRecording.create({
    data: { userId, dialogueLineId, audioData, mimeType },
  });
  return NextResponse.json({ id: recording.id, createdAt: recording.createdAt }, { status: 201 });
}
