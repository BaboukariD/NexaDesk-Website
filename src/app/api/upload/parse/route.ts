import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseVocabCsv } from "@/lib/ingest/csv";
import { parseLessonText } from "@/lib/ingest/text";
import { extractPdfText } from "@/lib/ingest/pdf";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    return NextResponse.json(parseVocabCsv(await file.text()));
  }

  if (name.endsWith(".txt")) {
    const topics = await prisma.topic.findMany({ select: { slug: true } });
    try {
      const result = await parseLessonText(await file.text(), topics.map((t) => t.slug));
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (name.endsWith(".pdf")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let extracted;
    try {
      extracted = await extractPdfText(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not read this PDF";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (!extracted.reliable) {
      return NextResponse.json({ error: extracted.warning }, { status: 422 });
    }

    const topics = await prisma.topic.findMany({ select: { slug: true } });
    try {
      const result = await parseLessonText(extracted.text, topics.map((t) => t.slug));
      return NextResponse.json({ ...result, source: "pdf" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: "Only .csv, .txt, and .pdf files are supported right now. Page-photo upload is coming." },
    { status: 400 }
  );
}
