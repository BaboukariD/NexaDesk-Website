#!/usr/bin/env bash
# Creates and applies a migration non-interactively. `prisma migrate dev`
# refuses to run outside a TTY, so this does the same thing by hand:
# diff the schema against migration history, write the SQL as a new
# migration, then deploy it (deploy has no interactive prompts).
#
# Usage: scripts/migrate.sh <name>
set -euo pipefail
NAME="${1:?Usage: scripts/migrate.sh <name>}"
cd "$(dirname "$0")/.."

DIFF=$(mktemp)
npx prisma migrate diff \
  --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./prisma/schema.prisma \
  --script > "$DIFF"

if [ ! -s "$DIFF" ]; then
  echo "No schema changes to migrate."
  exit 0
fi

TS=$(date -u +%Y%m%d%H%M%S)
DIR="prisma/migrations/${TS}_${NAME}"
mkdir -p "$DIR"
cp "$DIFF" "$DIR/migration.sql"
echo "Created $DIR/migration.sql"

npx prisma migrate deploy
npx prisma generate
