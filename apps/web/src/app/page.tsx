import { optionalUser } from '@/lib/server/context';
import { MarketingHeader } from '@/components/marketing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingEcosystem } from '@/components/landing/landing-ecosystem';
import { LandingCta } from '@/components/landing/landing-cta';
import { SiteFooter } from '@/components/site-footer';

export default async function LandingPage() {
  const user = await optionalUser();

  return (
    <>
      <MarketingHeader user={user} />
      <main>
        <LandingHero user={user} />
        <LandingFeatures />
        <LandingEcosystem />
        <LandingCta user={user} />
      </main>
      <SiteFooter />
    </>
  );
}
