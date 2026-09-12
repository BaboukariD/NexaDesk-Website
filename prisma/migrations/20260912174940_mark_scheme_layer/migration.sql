-- AlterTable
ALTER TABLE "ErrorPattern" ADD COLUMN "skill" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PracticePaper" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "listeningTranscriptAr" TEXT NOT NULL,
    "listeningTranscriptEn" TEXT NOT NULL,
    "listeningQuestions" TEXT NOT NULL,
    "readingPassageAr" TEXT NOT NULL,
    "readingPassageEn" TEXT NOT NULL,
    "readingQuestions" TEXT NOT NULL,
    "writingTaskId" INTEGER,
    "translationTaskId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticePaper_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PracticePaper_writingTaskId_fkey" FOREIGN KEY ("writingTaskId") REFERENCES "AssessmentTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PracticePaper_translationTaskId_fkey" FOREIGN KEY ("translationTaskId") REFERENCES "TranslationTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PracticePaper" ("createdAt", "id", "topicId") SELECT "createdAt", "id", "topicId" FROM "PracticePaper";
DROP TABLE "PracticePaper";
ALTER TABLE "new_PracticePaper" RENAME TO "PracticePaper";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

