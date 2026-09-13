import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const item = await prisma.captureItem.findFirst({ where: { id: Number(id), userId } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.captureItem.update({ where: { id: item.id }, data: { status: "discarded" } });
  return NextResponse.json({ ok: true });
}
