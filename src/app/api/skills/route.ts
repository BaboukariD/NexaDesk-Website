import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { getSkillBreakdown } from "@/lib/skills";

export async function GET() {
  const userId = await getUserId();
  return NextResponse.json(await getSkillBreakdown(userId));
}
