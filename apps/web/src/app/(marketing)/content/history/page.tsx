import type { Metadata } from 'next';
import { ContentHistoryClient } from '@/components/content/content-history-client';

export const metadata: Metadata = {
  title: 'Historial de Contenido · UltraIa',
  description: 'Contenido generado desde ebooks y cursos. Visualiza, descarga o continua generando.',
};

export default function ContentHistoryPage() {
  return <ContentHistoryClient />;
}
