import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { ultraiaPrisma?: PrismaClient };

export const prisma =
  globalForPrisma.ultraiaPrisma ??
  new PrismaClient({
    log: process.env.ULTRAIA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.ultraiaPrisma = prisma;
}

export type Db = PrismaClient;
