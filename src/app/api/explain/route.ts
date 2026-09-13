import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { explainError } from "@/lib/explain";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const expectedArabic = typeof body.expectedArabic === "string" ? body.expectedArabic : "";
  const userAnswer = typeof body.userAnswer === "string" ? body.userAnswer : "";
  if (!expectedArabic) return NextResponse.json({ error: "expectedArabic is required" }, { status: 400 });

  const userId = await getUserId();
  try {
    const explanation = await explainError(userId, { expectedArabic, userAnswer, englishGloss: body.englishGloss });
    return NextResponse.json({ explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not get an explanation";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
