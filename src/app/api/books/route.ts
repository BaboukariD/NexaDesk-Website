import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const books = await prisma.book.findMany({
    include: { units: { include: { lessons: true }, orderBy: { number: "asc" } } },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(books);
}
