'use client';

import { useState } from 'react';
import { Download, Save, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { postJson, type AssetDraft } from './types';

/**
 * Barra de acciones del media hub: Guardar (binario durable en cloud) ·
 * Descargar · Eliminar. Es el corazón de "guardar y descargar" por modelo.
 */
export function AssetActions({
  draft,
  onSaved,
  compact,
}: {
  draft: AssetDraft;
  onSaved?: (assetId: string) => void;
  compact?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    try {
      const res = await postJson<{ id: string; storage: string }>('/api/library/assets', {
        ...draft,
        saveBinary: true,
      });
      setSavedId(res.id);
      toast.success(
        res.storage === 'cloud' ? 'Guardado (binario durable)' : 'Guardado (URL externa — el binario falló)',
      );
      onSaved?.(res.id);
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!savedId) return;
    try {
      const res = await fetch(`/api/assets/${savedId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedId(null);
      toast.success('Eliminado');
    } catch (e) {
      toast.error((e as Error).message || 'No se pudo eliminar');
    }
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150 disabled:opacity-40';
  const idle = `${btn} border-border-muted text-neutral-300 hover:border-primary/60 hover:text-primary`;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {!savedId && (
        <button type="button" className={idle} onClick={save} disabled={saving || !draft.url}>
          {saving ? <span className="animate-pulse">Guardando…</span> : <><Save className="h-3.5 w-3.5" /> Guardar</>}
        </button>
      )}
      {savedId && (
        <>
          <a className={idle} href={`/api/assets/${savedId}/download`} download>
            <Download className="h-3.5 w-3.5" /> Descargar
          </a>
          <span className={`${btn} border-primary/50 text-primary`}>
            <Check className="h-3.5 w-3.5" /> Guardado
          </span>
          {!compact && (
            <button type="button" className={`${btn} border-destructive/40 text-red-300 hover:bg-destructive/10`} onClick={remove}>
              <Trash2 className="h-3.5 w-3.5" /> Eliminar
            </button>
          )}
        </>
      )}
    </div>
  );
}
