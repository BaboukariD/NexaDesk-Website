import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { runBackup } from "@/lib/export";

export async function POST() {
  const userId = await getUserId();
  await runBackup(userId, "manual");
  return NextResponse.json({ ok: true });
}
