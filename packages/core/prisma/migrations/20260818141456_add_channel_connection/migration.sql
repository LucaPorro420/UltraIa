-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canal" TEXT NOT NULL,
    "tokenCifrado" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT,
    "expiresAt" DATETIME,
    "metaJson" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'CONNECTED',
    "ultimoTestAt" DATETIME,
    "ultimoError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_canal_key" ON "ChannelConnection"("canal");
