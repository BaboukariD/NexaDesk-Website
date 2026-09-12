-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "titleAr" TEXT,
    "source" TEXT NOT NULL,
    "fileRef" TEXT
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bookId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    CONSTRAINT "Unit_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unitId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    CONSTRAINT "Lesson_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "order" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "VocabItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lessonId" INTEGER NOT NULL,
    "topicId" INTEGER,
    "userId" INTEGER NOT NULL,
    "arabic" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "root" TEXT,
    "gender" TEXT,
    "plural" TEXT,
    "notes" TEXT,
    CONSTRAINT "VocabItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VocabItem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VocabItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Dialogue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lessonId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "Dialogue_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DialogueLine" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dialogueId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "arabic" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    CONSTRAINT "DialogueLine_dialogueId_fkey" FOREIGN KEY ("dialogueId") REFERENCES "Dialogue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrammarNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lessonId" INTEGER,
    "topicId" INTEGER,
    "title" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    CONSTRAINT "GrammarNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrammarNote_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lessonId" INTEGER NOT NULL,
    "topicId" INTEGER,
    "type" TEXT NOT NULL,
    "skill" TEXT,
    "prompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "options" TEXT,
    CONSTRAINT "Exercise_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Exercise_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "exerciseId" INTEGER,
    "skill" TEXT,
    "userAnswer" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "responseMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "vocabId" INTEGER NOT NULL,
    "ease" REAL NOT NULL DEFAULT 2.5,
    "intervalDays" REAL NOT NULL DEFAULT 0,
    "dueDate" DATETIME NOT NULL,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReviewState_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "VocabItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vocabId" INTEGER NOT NULL,
    "sentenceAr" TEXT,
    "sentenceEn" TEXT,
    "reverseMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flashcard_vocabId_fkey" FOREIGN KEY ("vocabId") REFERENCES "VocabItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ErrorPattern" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "exampleItems" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ErrorPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "itemsAttempted" INTEGER NOT NULL DEFAULT 0,
    "accuracy" REAL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "wordCountTarget" INTEGER,
    "imageRef" TEXT,
    "rolePlayPrompts" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentTask_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "contentScore" INTEGER NOT NULL,
    "accuracyScore" INTEGER NOT NULL,
    "rangeScore" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "modelAnswer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessmentAttempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AssessmentTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationTask_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "translationTaskId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "sourceText" TEXT NOT NULL,
    "targetText" TEXT NOT NULL,
    CONSTRAINT "TranslationItem_translationTaskId_fkey" FOREIGN KEY ("translationTaskId") REFERENCES "TranslationTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationAttempt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "translationItemId" INTEGER NOT NULL,
    "userAnswer" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TranslationAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TranslationAttempt_translationItemId_fkey" FOREIGN KEY ("translationItemId") REFERENCES "TranslationItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentenceBuilderSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    CONSTRAINT "SentenceBuilderSet_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentenceBuilderColumn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "setId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "SentenceBuilderColumn_setId_fkey" FOREIGN KEY ("setId") REFERENCES "SentenceBuilderSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentenceBuilderOption" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "columnId" INTEGER NOT NULL,
    "arabic" TEXT NOT NULL,
    "gloss" TEXT NOT NULL,
    CONSTRAINT "SentenceBuilderOption_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "SentenceBuilderColumn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticePaper" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticePaper_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticePaperResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paperId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "listeningScorePct" REAL NOT NULL,
    "readingScorePct" REAL NOT NULL,
    "writingContentScore" INTEGER NOT NULL,
    "writingAccuracyScore" INTEGER NOT NULL,
    "writingRangeScore" INTEGER NOT NULL,
    "translationScorePct" REAL NOT NULL,
    "overallPct" REAL NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticePaperResult_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "PracticePaper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PracticePaperResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewState_userId_vocabId_key" ON "ReviewState"("userId", "vocabId");
