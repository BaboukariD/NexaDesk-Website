import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { search } from "@/lib/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const userId = await getUserId();
  const results = await search(userId, q);
  return NextResponse.json(results);
}
