import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  const backup = await prisma.backup.findFirst({ where: { id: Number(id), userId } });
  if (!backup) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(backup.data, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${backup.createdAt.toISOString().slice(0, 10)}.json"`,
    },
  });
}
