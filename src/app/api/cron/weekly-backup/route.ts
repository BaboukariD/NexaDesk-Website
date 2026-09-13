import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { runBackup } from "@/lib/export";

// Vercel Cron calls this on a schedule (see vercel.json "crons") with
// an Authorization: Bearer $CRON_SECRET header when CRON_SECRET is
// set — checked here so this endpoint can't be triggered by anyone
// who finds the URL.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const userId = await getUserId();
  await runBackup(userId, "weekly");
  return NextResponse.json({ ok: true });
}
