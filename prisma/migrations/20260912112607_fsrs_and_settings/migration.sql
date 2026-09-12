-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "newCardsPerDay" INTEGER NOT NULL DEFAULT 15
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flashcard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vocabId" INTEGER NOT NULL,
    "sentenceAr" TEXT,
    "sentenceEn" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flashcard_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "VocabItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Flashcard" ("createdAt", "id", "sentenceAr", "sentenceEn", "vocabId") SELECT "createdAt", "id", "sentenceAr", "sentenceEn", "vocabId" FROM "Flashcard";
DROP TABLE "Flashcard";
ALTER TABLE "new_Flashcard" RENAME TO "Flashcard";
CREATE TABLE "new_ReviewState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "flashcardId" INTEGER NOT NULL,
    "due" DATETIME NOT NULL,
    "stability" REAL NOT NULL DEFAULT 0,
    "difficulty" REAL NOT NULL DEFAULT 0,
    "scheduledDays" REAL NOT NULL DEFAULT 0,
    "learningSteps" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "state" TEXT NOT NULL DEFAULT 'New',
    "lastReview" DATETIME,
    CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewState_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ReviewState" ("id", "lapses", "userId") SELECT "id", "lapses", "userId" FROM "ReviewState";
DROP TABLE "ReviewState";
ALTER TABLE "new_ReviewState" RENAME TO "ReviewState";
CREATE UNIQUE INDEX "ReviewState_userId_flashcardId_key" ON "ReviewState"("userId", "flashcardId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Book_title_key" ON "Book"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_unitId_number_key" ON "Lesson"("unitId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_bookId_number_key" ON "Unit"("bookId", "number");

