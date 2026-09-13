import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { getRecentWords } from "@/lib/cold-recall";

export async function GET() {
  const userId = await getUserId();
  const words = await getRecentWords(userId);
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return NextResponse.json(shuffled);
}
