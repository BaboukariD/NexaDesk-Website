import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getUserId();
  const items = await prisma.captureItem.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

// Section F: "one field, Arabic in, nothing else required." No gloss,
// no lesson, no topic — it sits in the inbox until processed.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const arabic = typeof body.arabic === "string" ? body.arabic.trim() : "";
  if (!arabic) return NextResponse.json({ error: "arabic is required" }, { status: 400 });

  const userId = await getUserId();
  const item = await prisma.captureItem.create({ data: { userId, arabic } });
  return NextResponse.json(item, { status: 201 });
}
