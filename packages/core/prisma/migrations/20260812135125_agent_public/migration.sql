-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AgentBlueprint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "evalInputs" TEXT NOT NULL DEFAULT '[]',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentBlueprint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AgentBlueprint" ("createdAt", "evalInputs", "id", "name", "taskDescription", "workspaceId") SELECT "createdAt", "evalInputs", "id", "name", "taskDescription", "workspaceId" FROM "AgentBlueprint";
DROP TABLE "AgentBlueprint";
ALTER TABLE "new_AgentBlueprint" RENAME TO "AgentBlueprint";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
