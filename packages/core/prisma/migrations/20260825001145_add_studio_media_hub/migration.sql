-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GeneratedAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "seed" INTEGER,
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1024,
    "height" INTEGER NOT NULL DEFAULT 1024,
    "sourcePromptId" TEXT,
    "storage" TEXT NOT NULL DEFAULT 'external',
    "cloudPath" TEXT,
    "parentId" TEXT,
    "metaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GeneratedAsset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GeneratedAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GeneratedAsset" ("createdAt", "height", "id", "mediaType", "model", "prompt", "provider", "seed", "sourcePromptId", "url", "userId", "width") SELECT "createdAt", "height", "id", "mediaType", "model", "prompt", "provider", "seed", "sourcePromptId", "url", "userId", "width" FROM "GeneratedAsset";
DROP TABLE "GeneratedAsset";
ALTER TABLE "new_GeneratedAsset" RENAME TO "GeneratedAsset";
CREATE INDEX "GeneratedAsset_userId_mediaType_idx" ON "GeneratedAsset"("userId", "mediaType");
CREATE INDEX "GeneratedAsset_parentId_idx" ON "GeneratedAsset"("parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
