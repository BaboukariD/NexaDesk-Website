-- CreateTable
CREATE TABLE "StickyWord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "arabic" TEXT NOT NULL,
    "gloss" TEXT,
    "timesSeen" INTEGER NOT NULL DEFAULT 0,
    "timesWrong" INTEGER NOT NULL DEFAULT 0,
    "lastWrongAnswers" TEXT NOT NULL DEFAULT '[]',
    "skillBreakdown" TEXT NOT NULL DEFAULT '{"reading":{"seen":0,"wrong":0},"listening":{"seen":0,"wrong":0},"production":{"seen":0,"wrong":0}}',
    "correctDays" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "graduatedAt" DATETIME,
    CONSTRAINT "StickyWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StickyWord_userId_arabic_key" ON "StickyWord"("userId", "arabic");

