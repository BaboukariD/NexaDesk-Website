import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseVocabCsv } from "@/lib/ingest/csv";
import { parseLessonText } from "@/lib/ingest/text";
import { extractPdfText } from "@/lib/ingest/pdf";
import { parseLessonPhoto, isSupportedImageType } from "@/lib/ingest/photo";

// Vercel Functions hard-cap the request body at 4.5MB — a larger
// payload is rejected at the platform level before this code ever
// runs, so this check mostly matters for anything just under that.
// The client (src/app/upload/page.tsx) checks first and blocks the
// request from firing at all, but that's advisory, not enforcement.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — uploads are capped at 4MB. Upload one page at a time as a photo, or split a multi-page PDF.`,
      },
      { status: 413 }
    );
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

  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".gif") || name.endsWith(".webp")) {
    const mediaType = file.type;
    if (!isSupportedImageType(mediaType)) {
      return NextResponse.json({ error: `Unsupported image type: ${mediaType || "unknown"}` }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const topics = await prisma.topic.findMany({ select: { slug: true } });
    try {
      const result = await parseLessonPhoto(buffer, mediaType, topics.map((t) => t.slug));
      return NextResponse.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json(
    { error: "Supported: .csv, .txt, .pdf, .png, .jpg, .jpeg, .gif, .webp" },
    { status: 400 }
  );
}
