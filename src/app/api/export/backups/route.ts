import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function GET() {
  const userId = await getUserId();
  const backups = await prisma.backup.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, trigger: true, createdAt: true },
  });
  return NextResponse.json(backups);
}
