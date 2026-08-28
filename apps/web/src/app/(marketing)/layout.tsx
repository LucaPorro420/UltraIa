import type { ReactNode } from 'react';
import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { SiteFooter } from '@/components/site-footer';

// Layout compartido del sitio público (marketing). Centraliza el header y el footer
// para todas las páginas fuera del app shell autenticado, eliminando la repetición
// en cada página.
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const user = await optionalUser();
  return (
    <>
      <MarketingHeader user={user} />
      {children}
      <SiteFooter />
    </>
  );
}
