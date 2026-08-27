'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Annotation {
  id: string;
  page: string;
  selector: string | null;
  anchorText: string | null;
  kind: 'nota' | 'peticion' | 'texto';
  body: string;
  nuevoTexto: string | null;
  estado: 'abierta' | 'resuelta';
  visible: boolean;
  creadoPorId: string | null;
}

/**
 * Capa de edicion visual no-code (loop-120). Montada en (app)/layout.tsx:
 *  - Aplica reemplazos de texto (kind=texto) por selector tras la hidratacion.
 *  - Muestra un panel con las notas/peticiones de la pagina actual.
 *  - En modo edicion (?editar=1) permite agregar nota/peticion inline.
 */
export function AnnotationLayer() {
  const pathname = usePathname();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    setEditMode(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('editar') === '1');
    let cancelled = false;
    setLoading(true);
    fetch(`/api/editor/annotations?page=${encodeURIComponent(pathname)}&visibleOnly=1`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (cancelled) return;
        const items: Annotation[] = data.items ?? [];
        setAnnotations(items);
        for (const a of items) {
          if (a.kind === 'texto' && a.nuevoTexto && a.selector) {
            try {
              const el = document.querySelector(a.selector);
              if (el) el.textContent = a.nuevoTexto;
            } catch {
              /* selector invalido: ignorar */
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!pathname) return null;

  const addAnnotation = async (kind: 'nota' | 'peticion', body: string) => {
    if (!body.trim()) return;
    const res = await fetch('/api/editor/annotations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page: pathname, kind, body }),
    });
    if (res.ok) {
      const created = (await res.json()) as Annotation;
      setAnnotations((prev) => [...prev, created]);
    }
  };

  return (
    <>
      <button
        aria-label="Anotaciones"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-white/10 bg-black/70 px-3 py-2 text-xs text-white backdrop-blur"
        style={{ boxShadow: '0 0 0 1px rgba(139,92,246,0.4)' }}
        type="button"
      >
        {open ? 'Cerrar' : `Anotaciones${loading ? '…' : ` (${annotations.length})`}`}
      </button>
      {open && (
        <div className="fixed bottom-16 right-4 z-50 max-h-[70vh] w-80 overflow-auto rounded-lg border border-white/10 bg-[#111115] p-3 text-white/90 shadow-2xl">
          <div className="mb-2 text-sm font-semibold">Anotaciones de la página</div>
          {editMode && (
            <div className="mb-3 space-y-2 rounded-md border border-white/10 p-2">
              <div className="text-xs text-white/60">
                Modo edición: agrega una nota o petición para esta página.
              </div>
              <textarea
                id="ann-body"
                placeholder="Texto..."
                className="w-full rounded bg-black/40 p-1 text-xs"
                rows={2}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded bg-[#8b5cf6] px-2 py-1 text-xs"
                  onClick={() => {
                    const el = document.getElementById('ann-body') as HTMLTextAreaElement | null;
                    if (el?.value) addAnnotation('nota', el.value);
                  }}
                >
                  Nota
                </button>
                <button
                  type="button"
                  className="rounded bg-white/10 px-2 py-1 text-xs"
                  onClick={() => {
                    const el = document.getElementById('ann-body') as HTMLTextAreaElement | null;
                    if (el?.value) addAnnotation('peticion', el.value);
                  }}
                >
                  Petición
                </button>
              </div>
            </div>
          )}
          {annotations.length === 0 && <div className="text-xs text-white/50">Sin anotaciones.</div>}
          <ul className="space-y-2">
            {annotations.map((a) => (
              <li key={a.id} className="rounded border border-white/10 p-2 text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <span className="rounded bg-white/10 px-1 text-[10px] uppercase">{a.kind}</span>
                  <span className="rounded bg-white/10 px-1 text-[10px]">{a.estado}</span>
                </div>
                <div className="whitespace-pre-wrap">{a.body}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
