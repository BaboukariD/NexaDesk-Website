import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";
import { vocabToCsv } from "@/lib/export";

export async function GET() {
  const userId = await getUserId();
  const vocab = await prisma.vocabItem.findMany({ where: { userId } });
  const csv = vocabToCsv(vocab);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vocabulary-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
