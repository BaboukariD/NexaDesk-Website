import bcrypt from "bcryptjs";

// Single-user auth. The password is never in source: the app only ever
// sees its bcrypt hash, read from APP_PASSWORD_HASH. Generate that hash
// with `npm run hash-password -- "your password"` and paste it into
// .env.local — see scripts/hash-password.js.

export const APP_USERNAME = "Djibril";

export async function verifyPassword(username: string, password: string): Promise<boolean> {
  if (username !== APP_USERNAME) return false;

  const encoded = process.env.APP_PASSWORD_HASH;
  if (!encoded) {
    throw new Error(
      "APP_PASSWORD_HASH is not set. Run `npm run hash-password -- \"your password\"` and put the result in .env.local."
    );
  }

  // Stored base64-encoded — see scripts/hash-password.js for why.
  const hash = Buffer.from(encoded, "base64").toString("utf8");

  return bcrypt.compare(password, hash);
}
