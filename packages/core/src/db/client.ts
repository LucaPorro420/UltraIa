/*
  Archivo: packages/core/src/db/client.ts
  Propósito (explicado para un adolescente):
  - Este archivo crea y exporta la conexión a la base de datos usando Prisma.
  - Prisma es una herramienta que facilita hablar con la base de datos (leer/escribir).

  Qué hace exactamente:
  - Busca la variable de entorno DATABASE_URL; si no existe usa una base de datos
    local SQLite llamada dev.db.
  - Ajusta la URL para forzar "connection_limit=1" cuando se usa SQLite: esto
    evita errores "database is locked" cuando varias partes del programa escriben
    al mismo tiempo.
  - Crea un `PrismaClient` (la conexión) y lo guarda en `globalThis` en desarrollo
    para que no se creen múltiples conexiones al recargar el servidor (evita leaks).

  Qué tocar si quieres cambiar a Postgres en producción:
  - No cambies este archivo para hacerlo; en su lugar, pon DATABASE_URL en tus
    variables de entorno apuntando a un Postgres (p. ej. postgres://usuario:pass@host:5432/dbname).
  - Quita `connection_limit=1` solo si usas un proveedor que soporta múltiples
    conexiones (Postgres sí lo hace). Prisma detectará el nuevo provider.

  Nota: mantuve la lógica intacta y añadí estos comentarios para que cualquiera
  que empiece pueda entender cómo se conecta la app a la base de datos.
*/

import { PrismaClient } from '@prisma/client';

// `globalThis` es la forma segura de guardar variables que viven mientras el
// proceso Node esté activo. Evita crear muchas instancias de Prisma en dev
// cuando Next.js recarga módulos.
const globalForPrisma = globalThis as unknown as { ultraiaPrisma?: PrismaClient };

// SQLite es single-writer: serializar conexiones con connection_limit=1 evita el
// error "database is locked" bajo concurrencia (chat + studio + otras rutas a la vez).
const baseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const sqliteUrl = baseUrl.includes('?') ? `${baseUrl}&connection_limit=1` : `${baseUrl}?connection_limit=1`;

export const prisma =
  globalForPrisma.ultraiaPrisma ??
  new PrismaClient({
    // Forzamos que la datasource use la URL calculada (SQLite con connection_limit).
    datasources: { db: { url: sqliteUrl } },
    // Control de logging: si ULTRAIA_LOG_QUERIES=1 veremos las queries en consola.
    log: process.env.ULTRAIA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

// En desarrollo guardamos la instancia en globalThis para reusar entre recargas.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.ultraiaPrisma = prisma;
}

export type Db = PrismaClient;
