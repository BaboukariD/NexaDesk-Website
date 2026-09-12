import { NextResponse } from "next/server";
import { suggestQuranReference } from "@/lib/roots";

export async function POST(_req: Request, { params }: { params: Promise<{ root: string }> }) {
  const { root } = await params;
  try {
    const suggestion = await suggestQuranReference(decodeURIComponent(root));
    return NextResponse.json(suggestion);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not get a suggestion";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
