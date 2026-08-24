import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { ultraiaPrisma?: PrismaClient };

// SQLite es single-writer: serializar conexiones con connection_limit=1 evita el
// error "database is locked" bajo concurrencia (chat + studio + otras rutas a la vez).
const baseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const sqliteUrl = baseUrl.includes('?') ? `${baseUrl}&connection_limit=1` : `${baseUrl}?connection_limit=1`;

export const prisma =
  globalForPrisma.ultraiaPrisma ??
  new PrismaClient({
    datasources: { db: { url: sqliteUrl } },
    log: process.env.ULTRAIA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.ultraiaPrisma = prisma;
}

export type Db = PrismaClient;
