import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

// Issues short-lived tokens for direct browser-to-Blob uploads, so a
// large file's bytes never pass through this Vercel Function and
// never hit its hard 4.5MB request-body cap (see MAX_UPLOAD_BYTES in
// src/app/api/upload/parse/route.ts for the small-file path this
// replaces for anything bigger).
//
// No session check here beyond what already runs: src/proxy.ts gates
// every non-public path, this one included, so a request only reaches
// this handler with a valid session already verified.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "text/plain",
          "text/csv",
          "application/pdf",
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        addRandomSuffix: true,
        maximumSizeInBytes: 10 * 1024 * 1024,
      }),
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
