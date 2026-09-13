import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET(req: Request) {
  const lessonId = Number(new URL(req.url).searchParams.get("lessonId"));
  const userId = await getUserId();
  const note = await prisma.lessonNote.findUnique({ where: { lessonId_userId: { lessonId, userId } } });
  return NextResponse.json({ body: note?.body ?? "" });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => ({}));
  const lessonId = Number(body.lessonId);
  const text = typeof body.body === "string" ? body.body : "";
  const userId = await getUserId();

  const note = await prisma.lessonNote.upsert({
    where: { lessonId_userId: { lessonId, userId } },
    update: { body: text },
    create: { lessonId, userId, body: text },
  });
  return NextResponse.json(note);
}
