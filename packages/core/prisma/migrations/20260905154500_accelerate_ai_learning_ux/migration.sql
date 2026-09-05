-- Additive persistence for provider/chat telemetry, learning runs, and curated feedback.
ALTER TABLE "EvalRun" ADD COLUMN "totalCases" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EvalRun" ADD COLUMN "completedCases" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EvalRun" ADD COLUMN "cachedCases" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EvalRun" ADD COLUMN "durationMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EvalRun" ADD COLUMN "gateState" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "EvalRun" ADD COLUMN "promotionOutcome" TEXT;

CREATE TABLE "LearningRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agentVersionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "totalCases" INTEGER NOT NULL DEFAULT 0,
  "completedCases" INTEGER NOT NULL DEFAULT 0,
  "cachedCases" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "regressionScore" REAL,
  "gateState" TEXT NOT NULL DEFAULT 'PENDING',
  "promotionOutcome" TEXT,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningRun_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "AgentVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "LearningRun_agentVersionId_createdAt_idx" ON "LearningRun" ("agentVersionId", "createdAt");

CREATE TABLE "ProviderTelemetry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "windowStart" DATETIME NOT NULL,
  "provider" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "cacheHits" INTEGER NOT NULL DEFAULT 0,
  "fallbackCount" INTEGER NOT NULL DEFAULT 0,
  "totalLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ProviderTelemetry_windowStart_provider_strategy_key" ON "ProviderTelemetry" ("windowStart", "provider", "strategy");
CREATE INDEX "ProviderTelemetry_windowStart_provider_idx" ON "ProviderTelemetry" ("windowStart", "provider");

CREATE TABLE "ChatTelemetry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "windowStart" DATETIME NOT NULL,
  "provider" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "modelTier" TEXT NOT NULL,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "cacheHits" INTEGER NOT NULL DEFAULT 0,
  "fallbackCount" INTEGER NOT NULL DEFAULT 0,
  "totalLatencyMs" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ChatTelemetry_windowStart_provider_strategy_modelTier_key" ON "ChatTelemetry" ("windowStart", "provider", "strategy", "modelTier");
CREATE INDEX "ChatTelemetry_windowStart_provider_idx" ON "ChatTelemetry" ("windowStart", "provider");

CREATE TABLE "LearningSignal" (
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
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "LearningSignal_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "AgentBlueprint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LearningSignal_blueprintId_fingerprint_key" ON "LearningSignal" ("blueprintId", "fingerprint");
CREATE INDEX "LearningSignal_blueprintId_status_idx" ON "LearningSignal" ("blueprintId", "status");
