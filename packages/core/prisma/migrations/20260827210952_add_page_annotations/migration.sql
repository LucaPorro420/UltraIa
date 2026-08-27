-- CreateTable
CREATE TABLE "PageAnnotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "page" TEXT NOT NULL,
    "selector" TEXT,
    "anchorText" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'nota',
    "body" TEXT NOT NULL,
    "nuevoTexto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PageAnnotation_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PageAnnotation_page_estado_idx" ON "PageAnnotation"("page", "estado");

-- CreateIndex
CREATE INDEX "PageAnnotation_page_visible_idx" ON "PageAnnotation"("page", "visible");
