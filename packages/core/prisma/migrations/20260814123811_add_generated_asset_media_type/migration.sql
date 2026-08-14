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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GeneratedAsset" ("createdAt", "height", "id", "model", "prompt", "provider", "seed", "sourcePromptId", "url", "userId", "width") SELECT "createdAt", "height", "id", "model", "prompt", "provider", "seed", "sourcePromptId", "url", "userId", "width" FROM "GeneratedAsset";
DROP TABLE "GeneratedAsset";
ALTER TABLE "new_GeneratedAsset" RENAME TO "GeneratedAsset";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
