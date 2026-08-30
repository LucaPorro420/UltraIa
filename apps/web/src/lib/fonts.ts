import { Inter } from 'next/font/google';

// Solo Inter — reducida de 3 fuentes a 1 para minimizar CSS descargado en el primer paint.
// Plus Jakarta Sans y JetBrains Mono se eliminaron porque no se usan activamente
// y sumaban ~90KB de CSS que Chrome debía parsear.
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Alias para compatibilidad con imports existentes
export const jakarta = inter;
export const jetbrains = inter;