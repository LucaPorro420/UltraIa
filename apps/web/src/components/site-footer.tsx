import Link from 'next/link';

const FOOTER_LINKS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Producto',
    links: [
      { label: 'Explorar', href: '/explore' },
      { label: 'Recursos', href: '/recursos' },
      { label: 'Galería', href: '/gallery' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Canales y config', href: '/recursos' },
      { label: 'Documentación', href: '/recursos' },
      { label: 'Estado', href: '/roadmap' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', href: '/recursos' },
      { label: 'Términos', href: '/recursos' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-panel/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight text-white">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Ultra<span className="text-primary">Ia</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-neutral-500">
            Agentes de IA que se construyen, ejecutan y publican solos.
          </p>
        </div>

        {FOOTER_LINKS.map((col) => (
          <div key={col.title}>
            <div className="text-sm font-medium text-neutral-300">{col.title}</div>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-neutral-500 transition-colors duration-200 hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border-subtle">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-neutral-600">
          © {new Date().getFullYear()} UltraIa. Construido para crear.
        </div>
      </div>
    </footer>
  );
}
