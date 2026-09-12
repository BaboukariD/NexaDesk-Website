import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/current-user";

export async function POST() {
  const userId = await getUserId();
  const session = await prisma.session.create({ data: { userId } });
  return NextResponse.json({ sessionId: session.id });
}
