'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
 * Panel admin del Editor Visual (loop-120): lista todas las anotaciones agrupadas por
 * pagina, permite crear una nota general, resolver/reabrir, cambiar visibilidad y borrar.
 */
export function EditorAdminClient({ isAdmin, userName }: { isAdmin: boolean; userName: string }) {
  const [items, setItems] = useState<Annotation[]>([]);
  const [page, setPage] = useState('');
  const [body, setBody] = useState('');

  const load = () => {
    fetch('/api/editor/annotations')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const patch = async (id: string, action: 'resolve' | 'reopen' | 'visible', extra: Record<string, unknown> = {}) => {
    await fetch(`/api/editor/annotations/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    load();
  };

  const del = async (id: string) => {
    await fetch(`/api/editor/annotations/${id}`, { method: 'DELETE' });
    load();
  };

  const create = async () => {
    if (!page.trim() || !body.trim()) return;
    await fetch('/api/editor/annotations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ page: page.trim(), kind: 'nota', body: body.trim() }),
    });
    setBody('');
    load();
  };

  const grouped = items.reduce<Record<string, Annotation[]>>((acc, a) => {
    (acc[a.page] ||= []).push(a);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-white/90">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editor Visual</h1>
        <span className="text-xs text-white/50">Sesión: {userName}</span>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#111115] p-4">
        <div className="mb-2 text-sm font-medium">Nueva nota general</div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="/ruta-de-pagina"
            className="rounded bg-black/40 px-2 py-1 text-sm"
          />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Texto de la nota..."
            className="flex-1 rounded bg-black/40 px-2 py-1 text-sm"
          />
          <button type="button" onClick={create} className="rounded bg-[#8b5cf6] px-3 py-1 text-sm">
            Crear
          </button>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-sm text-white/50">No hay anotaciones todavía.</div>
      )}

      {Object.entries(grouped).map(([pg, list]) => (
        <div key={pg} className="rounded-lg border border-white/10 bg-[#111115] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-sm text-white/80">{pg}</span>
            <Link href={`${pg}?editar=1`} className="text-xs text-[#8b5cf6] hover:underline">
              Abrir en modo edición
            </Link>
          </div>
          <ul className="space-y-2">
            {list.map((a) => (
              <li key={a.id} className="rounded border border-white/10 p-2 text-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/10 px-1 text-[10px] uppercase">{a.kind}</span>
                  <span className="rounded bg-white/10 px-1 text-[10px]">{a.estado}</span>
                  {a.kind === 'texto' && a.nuevoTexto && (
                    <span className="rounded bg-white/10 px-1 text-[10px]">→ {a.nuevoTexto}</span>
                  )}
                  {!a.visible && <span className="text-[10px] text-amber-300">oculta</span>}
                  {isAdmin && (
                    <span className="ml-auto flex gap-2">
                      {a.estado === 'abierta' ? (
                        <button
                          type="button"
                          className="text-[11px] text-emerald-300 hover:underline"
                          onClick={() => patch(a.id, 'resolve')}
                        >
                          Resolver
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-[11px] text-sky-300 hover:underline"
                          onClick={() => patch(a.id, 'reopen')}
                        >
                          Reabrir
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-[11px] text-white/60 hover:underline"
                        onClick={() => patch(a.id, 'visible', { visible: !a.visible })}
                      >
                        {a.visible ? 'Ocultar' : 'Mostrar'}
                      </button>
                      <button
                        type="button"
                        className="text-[11px] text-red-300 hover:underline"
                        onClick={() => del(a.id)}
                      >
                        Borrar
                      </button>
                    </span>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{a.body}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
