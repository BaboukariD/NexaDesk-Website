import { NextResponse } from "next/server";
import { get, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { parseVocabCsv } from "@/lib/ingest/csv";
import { parseLessonText } from "@/lib/ingest/text";
import { extractPdfText } from "@/lib/ingest/pdf";
import { extractScannedPdf } from "@/lib/ingest/pdf-vision";
import { parseLessonPhoto, isSupportedImageType } from "@/lib/ingest/photo";

// A scanned PDF's vision fallback (extractScannedPdf) can take several
// minutes for a full book — several sequential batches of Claude calls,
// not one fast request. Default Vercel Function timeout is 10s.
export const maxDuration = 300;

// Vercel Functions hard-cap the request body at 4.5MB, so anything
// bigger can't come through as multipart form data at all — the
// client (src/app/upload/page.tsx) routes those through Vercel Blob
// instead (direct browser-to-storage, see /api/upload/blob-token) and
// sends this route a { blobPathname, blobUrl, fileName } JSON body
// rather than a file. DIRECT_UPLOAD_MAX_BYTES is the ceiling for the form-data path;
// ABSOLUTE_MAX_BYTES is the overall app ceiling regardless of path.
const DIRECT_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const ABSOLUTE_MAX_BYTES = 10 * 1024 * 1024;

type UploadedFile = { name: string; type: string; size: number; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> };

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let file: UploadedFile;
  let blobUrlToClean: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null);
    const blobPathname = typeof body?.blobPathname === "string" ? body.blobPathname : "";
    const blobUrl = typeof body?.blobUrl === "string" ? body.blobUrl : "";
    const fileName = typeof body?.fileName === "string" ? body.fileName : "";
    if (!blobPathname || !fileName) {
      return NextResponse.json({ error: "Missing blobPathname or fileName" }, { status: 400 });
    }
    if (blobUrl) blobUrlToClean = blobUrl;

    // Private Blob stores require the SDK's authenticated get() — a
    // plain fetch(url) 401s, since the pathname alone isn't a bearer
    // credential the way a public blob's URL would be.
    const result = await get(blobPathname, { access: "private" }).catch(() => null);
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: "Could not retrieve the uploaded file" }, { status: 502 });
    }
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    const type = result.blob.contentType ?? "";
    file = {
      name: fileName,
      type,
      size: buffer.length,
      text: async () => buffer.toString("utf8"),
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    };
  } else {
    const form = await req.formData().catch(() => null);
    const formFile = form?.get("file");
    if (!formFile || typeof formFile === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (formFile.size > DIRECT_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        {
          error: `This file is ${(formFile.size / (1024 * 1024)).toFixed(1)}MB — direct uploads are capped at 4MB. Try again; files above that go through the large-file path automatically.`,
        },
        { status: 413 }
      );
    }
    file = formFile;
  }

  if (file.size > ABSOLUTE_MAX_BYTES) {
    if (blobUrlToClean) await cleanupBlob(blobUrlToClean);
    return NextResponse.json(
      {
        error: `This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — uploads are capped at 10MB. Upload one page at a time as a photo, or split a multi-page PDF.`,
      },
      { status: 413 }
    );
  }

  try {
    return await processFile(file);
  } finally {
    if (blobUrlToClean) await cleanupBlob(blobUrlToClean);
  }
}

// The blob only ever exists to get bytes past the function's request
// size limit — nothing reads it again after this route runs, so it's
// deleted right away rather than left to build up in storage.
async function cleanupBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (err) {
    console.error("Failed to delete temporary upload blob:", url, err);
  }
}

async function processFile(file: UploadedFile): Promise<NextResponse> {
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
      // No usable text layer — fall back to reading the pages as
      // images via Claude's PDF/vision support instead of rejecting
      // the file. Same idea as the photo-upload path, just automated
      // across the whole document (see src/lib/ingest/pdf-vision.ts).
      const topics = await prisma.topic.findMany({ select: { slug: true } });
      try {
        const result = await extractScannedPdf(buffer, topics.map((t) => t.slug));
        return NextResponse.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not read this PDF as images";
        return NextResponse.json({ error: message }, { status: 502 });
      }
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
