import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseVocabCsv } from "@/lib/ingest/csv";
import { parseLessonText } from "@/lib/ingest/text";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const text = await file.text();

  if (name.endsWith(".csv")) {
    return NextResponse.json(parseVocabCsv(text));
  }

  if (name.endsWith(".txt")) {
    const topics = await prisma.topic.findMany({ select: { slug: true } });
    try {
      const result = await parseLessonText(text, topics.map((t) => t.slug));
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: "Only .csv and .txt files are supported right now. PDF and photo upload are coming." },
    { status: 400 }
  );
}
