import Link from 'next/link';

type LandingCtaProps = {
  user: { name?: string | null; email: string } | null;
};

export function LandingCta({ user }: LandingCtaProps) {
  return (
    <section className="relative mx-auto max-w-5xl px-6 py-20 text-center">
      <div className="neo-aura rounded-3xl border border-border-subtle bg-panel/60 p-10 shadow-[0_0_40px_-20px_var(--color-neo-400)]">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Empieza a construir tu equipo de IA
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-neutral-400">
          Crea tu primer agente en minutos y publícalo en todos lados sin tocar un editor.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85"
            >
              Abrir app
            </Link>
          ) : (
            <Link
              href="/register"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:bg-primary/85"
            >
              Empieza gratis
            </Link>
          )}
          <Link
            href="/gallery"
            className="rounded-md border border-border-subtle bg-panel px-5 py-2.5 text-sm font-medium text-neutral-200 transition-colors duration-200 hover:border-neutral-600 hover:text-white"
          >
            Ver galería
          </Link>
        </div>
      </div>
    </section>
  );
}
