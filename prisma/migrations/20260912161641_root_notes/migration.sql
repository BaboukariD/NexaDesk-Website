-- CreateTable
CREATE TABLE "RootNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "root" TEXT NOT NULL,
    "quranRef" TEXT,
    "quranSnippet" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RootNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RootNote_userId_root_key" ON "RootNote"("userId", "root");

