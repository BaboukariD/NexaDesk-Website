import { SignJWT, jwtVerify } from "jose";

// A signed, httpOnly session cookie — no OAuth, no external session store.
// The JWT's only claim is the username; its signature is what makes it
// trustworthy, not its contents.

export const SESSION_COOKIE = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Put a long random string in .env.local (e.g. `openssl rand -base64 32`)."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(username: string): Promise<string> {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_DURATION_SECONDS;
