#!/usr/bin/env node
// Run once to generate the value for APP_PASSWORD_HASH in .env.local.
// Usage: npm run hash-password -- "your password"
// The plaintext password is never written anywhere by this script.

const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

// bcrypt hashes are full of "$NN$" sequences (e.g. $2a$12$...), and
// Next.js's .env loader does shell-style $VAR expansion — it will
// silently mangle a raw hash into garbage. Base64-encode it so the
// .env file only ever holds plain alphanumerics. auth.ts decodes it
// back before comparing.
const encoded = Buffer.from(hash, "utf8").toString("base64");

console.log("\nAdd this line to .env.local:\n");
console.log(`APP_PASSWORD_HASH=${encoded}\n`);
