import { getToolCatalog, CATALOG_LOCALES } from '@ultraia/core';
import { ToolCatalogClient } from './tool-catalog-client';

export const metadata = { title: 'Herramientas · UltraIa' };

const CATEGORY_LABELS: Record<string, string> = {
  'ia-ml': 'IA / ML',
  'diseno-ui': 'Diseno UI',
  'video-audio': 'Video y Audio',
  'codigo-dev': 'Codigo / Dev',
  'datos-backend': 'Datos / Backend',
  'seguridad': 'Seguridad',
  'nube-infra': 'Nube / Infra',
  'automatizacion': 'Automatizacion',
  'contenido-cms': 'Contenido / CMS',
  'aprendizaje': 'Aprendizaje',
  'productividad-equipo': 'Productividad / Equipo',
};

const LOCALE_LABELS: Record<string, string> = {
  es: 'Espanol', en: 'English', pt: 'Portugues', it: 'Italiano', de: 'Deutsch',
  zh: 'Chinese', ru: 'Russian', ar: 'Arabic', fr: 'Francais', hi: 'Hindi',
  ja: 'Japanese', ko: 'Korean', nl: 'Dutch', tr: 'Turkish',
};

export default function HerramientasPage() {
  const entries = getToolCatalog('es');
  return (
    <section className='neo-aura w-full'>
      <p className='font-mono text-[11px] uppercase tracking-widest text-neutral-500'>catalog</p>
      <h1 className='mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl'>
        Herramientas de <span className='gradient-neo-text'>UltraIa</span>
      </h1>
      <p className='mt-3 max-w-2xl text-sm text-neutral-400'>
        {entries.length} herramientas disponibles, categorizadas y multilingues.
      </p>
      <ToolCatalogClient
        entries={entries}
        locales={CATALOG_LOCALES}
        defaultLocale='es'
        categoryLabels={CATEGORY_LABELS}
        localeLabels={LOCALE_LABELS}
      />
    </section>
  );
}
