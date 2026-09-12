import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function PUT(req: Request, { params }: { params: Promise<{ root: string }> }) {
  const { root } = await params;
  const decodedRoot = decodeURIComponent(root);
  const userId = await getUserId();
  const body = await req.json().catch(() => ({}));

  const quranRef = typeof body.quranRef === "string" ? body.quranRef.trim() || null : null;
  const quranSnippet = typeof body.quranSnippet === "string" ? body.quranSnippet.trim() || null : null;

  const note = await prisma.rootNote.upsert({
    where: { userId_root: { userId, root: decodedRoot } },
    update: { quranRef, quranSnippet },
    create: { userId, root: decodedRoot, quranRef, quranSnippet },
  });

  return NextResponse.json(note);
}
