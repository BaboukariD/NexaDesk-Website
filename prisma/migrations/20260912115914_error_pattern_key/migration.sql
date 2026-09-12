-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ErrorPattern" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exampleItems" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ErrorPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ErrorPattern" ("description", "exampleItems", "frequency", "id", "lastSeen", "retired", "userId") SELECT "description", "exampleItems", "frequency", "id", "lastSeen", "retired", "userId" FROM "ErrorPattern";
DROP TABLE "ErrorPattern";
ALTER TABLE "new_ErrorPattern" RENAME TO "ErrorPattern";
CREATE UNIQUE INDEX "ErrorPattern_userId_key_key" ON "ErrorPattern"("userId", "key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

