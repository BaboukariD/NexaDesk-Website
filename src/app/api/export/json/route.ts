import { NextResponse } from "next/server";
import { getUserId } from "@/lib/current-user";
import { buildFullDump } from "@/lib/export";

export async function GET() {
  const userId = await getUserId();
  const dump = await buildFullDump(userId);
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="arabic-app-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
