import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vocabId = Number(id);
  const userId = await getUserId();

  const existing = await prisma.vocabItem.findFirst({ where: { id: vocabId, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const field of ["arabic", "english", "partOfSpeech", "root", "gender", "plural", "notes"] as const) {
    if (typeof body[field] === "string") data[field] = body[field].trim() || null;
  }
  if (typeof body.topicId === "number" || body.topicId === null) data.topicId = body.topicId;

  const updated = await prisma.vocabItem.update({ where: { id: vocabId }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vocabId = Number(id);
  const userId = await getUserId();

  const existing = await prisma.vocabItem.findFirst({ where: { id: vocabId, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.vocabItem.delete({ where: { id: vocabId } });
  return NextResponse.json({ ok: true });
}
