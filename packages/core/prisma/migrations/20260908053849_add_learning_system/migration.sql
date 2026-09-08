-- CreateTable
CREATE TABLE "LearningCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LearningModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningLesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentMarkdown" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 10,
    "difficulty" TEXT NOT NULL DEFAULT 'basic',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "quiz" JSONB,
    "exercise" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "prerequisites" TEXT NOT NULL DEFAULT '[]',
    "bilingualContent" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lessonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "metadata" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isOffline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearningResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "completedLessons" TEXT NOT NULL DEFAULT '[]',
    "currentLessonId" TEXT,
    "lastAccessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "totalTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDate" DATETIME,
    "settings" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "LearningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearningProgress_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LearningCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningModuleProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0,
    "completedLessons" TEXT NOT NULL DEFAULT '[]',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "LearningModuleProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearningModuleProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningLessonProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "score" REAL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMin" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "answers" JSONB,
    "notes" TEXT,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LearningLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearningLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LearningLesson" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BilingualDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BilingualVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "translationSource" TEXT,
    "translator" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BilingualVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "BilingualDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BilingualUserPref" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "leftLanguage" TEXT NOT NULL DEFAULT 'es',
    "rightLanguage" TEXT NOT NULL DEFAULT 'ar',
    "leftWidth" INTEGER NOT NULL DEFAULT 50,
    "rightWidth" INTEGER NOT NULL DEFAULT 50,
    "preset" TEXT,
    "syncScroll" BOOLEAN NOT NULL DEFAULT true,
    "showDiff" BOOLEAN NOT NULL DEFAULT false,
    "fontSize" INTEGER NOT NULL DEFAULT 16,
    "lineHeight" REAL NOT NULL DEFAULT 1.6,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    CONSTRAINT "BilingualUserPref_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BilingualUserPref_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "BilingualDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyDeck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deckId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "frontLang" TEXT NOT NULL DEFAULT 'es',
    "backLang" TEXT NOT NULL DEFAULT 'es',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "difficulty" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReview" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyCard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "StudyDeck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cardId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "previousEase" REAL NOT NULL,
    "previousInterval" INTEGER NOT NULL,
    "previousRepetitions" INTEGER NOT NULL,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "StudyCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deckId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'review',
    "cardsReviewed" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMin" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudySession_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "StudyDeck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "toolResults" JSONB,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StudyChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SearchIndex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" BLOB,
    "metadata" JSONB,
    "language" TEXT NOT NULL DEFAULT 'es',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" DATETIME,
    CONSTRAINT "SyncQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceSync" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT NOT NULL,
    "lastSyncAt" DATETIME,
    "pendingChanges" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeviceSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LearningSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blueprintId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "sourceFeedbackId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'feedback',
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signal" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "originalSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_LearningSignal" ("blueprintId", "createdAt", "fingerprint", "id", "kind", "occurrenceCount", "originalSource", "signal", "source", "sourceFeedbackId", "status", "updatedAt") SELECT "blueprintId", "createdAt", "fingerprint", "id", "kind", "occurrenceCount", "originalSource", "signal", "source", "sourceFeedbackId", "status", "updatedAt" FROM "LearningSignal";
DROP TABLE "LearningSignal";
ALTER TABLE "new_LearningSignal" RENAME TO "LearningSignal";
CREATE INDEX "LearningSignal_blueprintId_status_idx" ON "LearningSignal"("blueprintId", "status");
CREATE UNIQUE INDEX "LearningSignal_blueprintId_fingerprint_key" ON "LearningSignal"("blueprintId", "fingerprint");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LearningCourse_slug_key" ON "LearningCourse"("slug");

-- CreateIndex
CREATE INDEX "LearningCourse_category_order_idx" ON "LearningCourse"("category", "order");

-- CreateIndex
CREATE INDEX "LearningModule_courseId_order_idx" ON "LearningModule"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LearningModule_courseId_slug_key" ON "LearningModule"("courseId", "slug");

-- CreateIndex
CREATE INDEX "LearningLesson_moduleId_order_idx" ON "LearningLesson"("moduleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "LearningLesson_moduleId_slug_key" ON "LearningLesson"("moduleId", "slug");

-- CreateIndex
CREATE INDEX "LearningResource_lessonId_type_idx" ON "LearningResource"("lessonId", "type");

-- CreateIndex
CREATE INDEX "LearningProgress_userId_idx" ON "LearningProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_userId_courseId_key" ON "LearningProgress"("userId", "courseId");

-- CreateIndex
CREATE INDEX "LearningModuleProgress_userId_idx" ON "LearningModuleProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningModuleProgress_userId_moduleId_key" ON "LearningModuleProgress"("userId", "moduleId");

-- CreateIndex
CREATE INDEX "LearningLessonProgress_userId_status_idx" ON "LearningLessonProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LearningLessonProgress_userId_lessonId_key" ON "LearningLessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "BilingualDocument_slug_key" ON "BilingualDocument"("slug");

-- CreateIndex
CREATE INDEX "BilingualDocument_sourceType_sourceId_idx" ON "BilingualDocument"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "BilingualVersion_documentId_language_key" ON "BilingualVersion"("documentId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "BilingualUserPref_userId_documentId_key" ON "BilingualUserPref"("userId", "documentId");

-- CreateIndex
CREATE INDEX "StudyDeck_userId_idx" ON "StudyDeck"("userId");

-- CreateIndex
CREATE INDEX "StudyCard_deckId_nextReview_idx" ON "StudyCard"("deckId", "nextReview");

-- CreateIndex
CREATE INDEX "StudyReview_cardId_reviewedAt_idx" ON "StudyReview"("cardId", "reviewedAt");

-- CreateIndex
CREATE INDEX "StudySession_userId_startedAt_idx" ON "StudySession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "StudyChatSession_userId_updatedAt_idx" ON "StudyChatSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "StudyChatMessage_sessionId_createdAt_idx" ON "StudyChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SearchIndex_type_sourceId_idx" ON "SearchIndex"("type", "sourceId");

-- CreateIndex
CREATE INDEX "SearchIndex_language_idx" ON "SearchIndex"("language");

-- CreateIndex
CREATE INDEX "SyncQueue_userId_status_idx" ON "SyncQueue"("userId", "status");

-- CreateIndex
CREATE INDEX "SyncQueue_entityType_entityId_idx" ON "SyncQueue"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DeviceSync_userId_idx" ON "DeviceSync"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSync_userId_deviceId_key" ON "DeviceSync"("userId", "deviceId");
