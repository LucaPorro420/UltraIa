-- CreateTable
CREATE TABLE "TopicBrief" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tema" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "tono" TEXT NOT NULL,
    "angulo" TEXT NOT NULL,
    "fuentesJson" TEXT NOT NULL DEFAULT '[]',
    "score" REAL NOT NULL DEFAULT 0,
    "pubDate" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'NUEVO',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "procesadoEn" DATETIME
);

-- CreateIndex
CREATE INDEX "TopicBrief_estado_score_idx" ON "TopicBrief"("estado", "score");
