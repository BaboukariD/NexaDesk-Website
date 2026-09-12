import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));

  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing username or password" }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = await verifyPassword(username, password);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  }

  if (!valid) {
    return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
