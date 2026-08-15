-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefId" TEXT,
    "tema" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "paqueteJson" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "estado" TEXT NOT NULL DEFAULT 'DRAFT',
    "requiereAprobacion" BOOLEAN NOT NULL DEFAULT true,
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "resultadoJson" TEXT,
    "error" TEXT,
    "creadoPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Publication_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Publication_estado_scheduledAt_idx" ON "Publication"("estado", "scheduledAt");
