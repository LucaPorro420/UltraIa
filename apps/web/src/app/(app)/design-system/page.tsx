import type { Metadata } from 'next';
import { requireUser } from '@/lib/server/context';
import { ThemeProvider } from '@/components/ide/theme-provider';
import { DesignSystemClient } from './design-system-client';

export const metadata: Metadata = {
  title: 'UltraIa — Sistema de Diseño',
  description: 'Personaliza el tema, colores, fuentes y layout de UltraIa en tiempo real.',
};

export default async function DesignSystemPage() {
  await requireUser();
  return (
    <ThemeProvider>
      <DesignSystemClient />
    </ThemeProvider>
  );
}
