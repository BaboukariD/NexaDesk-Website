-- AlterTable
ALTER TABLE "ErrorPattern" ADD COLUMN "explanation" TEXT;

-- AlterTable
ALTER TABLE "VocabItem" ADD COLUMN "sourceRef" TEXT;

-- CreateTable
CREATE TABLE "CaptureItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "arabic" TEXT NOT NULL,
    "gloss" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "vocabId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaptureItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterferencePair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "wordAId" INTEGER NOT NULL,
    "wordBId" INTEGER NOT NULL,
    "swapCount" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterferencePair_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InterferencePair_wordAId_fkey" FOREIGN KEY ("wordAId") REFERENCES "VocabItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InterferencePair_wordBId_fkey" FOREIGN KEY ("wordBId") REFERENCES "VocabItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LessonNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lessonId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LessonNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LessonNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudioRecording" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "dialogueLineId" INTEGER NOT NULL,
    "audioData" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AudioRecording_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AudioRecording_dialogueLineId_fkey" FOREIGN KEY ("dialogueLineId") REFERENCES "DialogueLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "InterferencePair_userId_wordAId_wordBId_key" ON "InterferencePair"("userId", "wordAId", "wordBId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonNote_lessonId_userId_key" ON "LessonNote"("lessonId", "userId");

