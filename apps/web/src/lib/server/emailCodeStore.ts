import { InMemoryEmailCodeStore } from '@ultraia/core';

// Almacén singleton del código 2FA para conexiones (purpose: 'connection_2fa').
// En memoria: válido para una instancia de servidor (dev / prod single instance).
// Para escalar a multi-instancia, sustituir por un EmailCodeStore respaldado en
// Prisma (tabla EmailCode) sin cambiar la interfaz.
export const connection2faStore = new InMemoryEmailCodeStore();
