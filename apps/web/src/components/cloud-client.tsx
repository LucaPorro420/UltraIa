'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Cloud as CloudIcon,
  UploadCloud,
  FileVideo,
  FileAudio,
  FileImage,
  FileText,
  FileCode,
  FileJson,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Globe,
  Database,
  TriangleAlert,
} from 'lucide-react';

/** Formatea bytes a unidades binarias (sin importar el core — cloud.ts usa node:*). */
function humanSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'] as const;
  let value = bytes;
  let unit = 'B';
  for (const u of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = u;
  }
  return `${value % 1 === 0 ? Math.round(value) : value.toFixed(1)} ${unit}`;
}

interface Provider {
  id: string;
  name: string;
  active: boolean;
  detail: string;
  limits: string;
}

interface CloudFile {
  path: string;
  name: string;
  type: string;
  sizeBytes: number;
  mime: string;
  updatedAt: string;
  url?: string | null;
}

interface Manifest {
  count: number;
  totalBytes: number;
  byType: Record<string, number>;
}

const FILE_ICONS: Record<string, typeof FileVideo> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  document: FileText,
  script: FileCode,
  data: FileJson,
};

const PROVIDER_ICONS: Record<string, typeof HardDrive> = {
  local: HardDrive,
  r2: Globe,
  supabase: Database,
  vercel: Globe,
};

const PROVIDER_COLORS: Record<string, string> = {
  local: 'text-primary',
  r2: 'text-orange-400',
  supabase: 'text-emerald-400',
  vercel: 'text-neutral-300',
};

function FileGeneric(props: { className?: string }) {
  return <CloudIcon {...props} />;
}

export function CloudClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [statusRes, filesRes] = await Promise.all([
        fetch('/api/cloud/status'),
        fetch('/api/cloud/files'),
      ]);
      if (!statusRes.ok || !filesRes.ok) throw new Error('no autorizado o error de servidor');
      const status = await statusRes.json();
      const data = await filesRes.json();
      setProviders(status.providers ?? []);
      setFiles(data.files ?? []);
      setManifest(data.manifest ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error cargando el cloud');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File, dir?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (dir) form.append('dir', dir);
    const res = await fetch('/api/cloud/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `subida falló (${res.status})`);
    }
    await load();
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    for (const f of Array.from(list)) {
      try {
        await upload(f);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error de subida');
      }
    }
  };

  const remove = async (path: string) => {
    const res = await fetch('/api/cloud/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (res.ok) await load();
  };

  const copyPath = async (path: string) => {
    await navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1200);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold">Cloud</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Almacenamiento local de UltraIa (`.ultraia/cloud`) — listo para migrar a Cloudflare R2 con
            dominio gratuito `.pages.dev`.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-panel px-3 py-2 text-sm text-neutral-300 transition-colors duration-150 hover:bg-panel-hover"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Proveedores */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-neutral-200">Proveedores</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
            presupuesto {busy ? '…' : '$0/mes'}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {providers.map((p) => {
            const PIcon = PROVIDER_ICONS[p.id] ?? Globe;
            return (
              <div
                key={p.id}
                className={`rounded-lg border bg-panel p-4 transition-colors duration-150 ${
                  p.active ? 'border-border-subtle hover:border-border-muted' : 'border-border-subtle/60 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PIcon className={`h-4 w-4 ${PROVIDER_COLORS[p.id] ?? 'text-neutral-400'}`} />
                  <span className="text-[13px] font-semibold text-neutral-200">{p.name}</span>
                  <span
                    className={`ml-auto h-1.5 w-1.5 rounded-full ${
                      p.active ? 'bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)]' : 'bg-neutral-600'
                    }`}
                  />
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">{p.detail}</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-neutral-500">{p.limits}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="glass-panel rounded-lg p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Archivos</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{busy ? '…' : manifest?.count ?? 0}</p>
        </div>
        <div className="glass-panel rounded-lg p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Almacenado</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{busy ? '…' : humanSize(manifest?.totalBytes ?? 0)}</p>
        </div>
        <div className="glass-panel rounded-lg p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">Tipos</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">
            {busy ? '…' : Object.keys(manifest?.byType ?? {}).length}
          </p>
        </div>
      </section>

      {/* Subida */}
      <section
        className={`mt-6 rounded-lg border border-dashed p-6 text-center transition-colors duration-150 ${
          dragOver ? 'border-primary bg-primary/10' : 'border-border-muted bg-panel/40'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void onFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="mx-auto h-8 w-8 text-primary/70" />
        <p className="mt-3 text-sm text-neutral-300">
          Arrastra archivos aquí o{' '}
          <button
            onClick={() => inputRef.current?.click()}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            selecciónalos
          </button>
        </p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          hasta 100 MiB · mp4 mov webm mp3 wav png jpg pdf md json srt …
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
      </section>

      {/* Archivos */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-neutral-200">Archivos</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {files.length} en el cloud
          </span>
        </div>

        {busy ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-border-subtle bg-panel/60" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-border-subtle bg-panel/40 p-8 text-center">
            <CloudIcon className="mx-auto h-8 w-8 text-neutral-600" />
            <p className="mt-3 text-sm text-neutral-400">El cloud está vacío — sube tu primer archivo.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {files.map((f, i) => {
              const FIcon = FILE_ICONS[f.type] ?? FileGeneric;
              return (
                <li
                  key={f.path}
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-panel px-4 py-2.5 transition-colors duration-150 [animation:var(--animate-chat-enter)] hover:bg-panel-hover"
                >
                  <FIcon className="h-4 w-4 shrink-0 text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[12px] text-neutral-200">{f.path}</p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                      {f.type} · {humanSize(f.sizeBytes)}
                    </p>
                  </div>
                  <button
                    onClick={() => void copyPath(f.path)}
                    title="Copiar ruta"
                    className="rounded p-1.5 text-neutral-500 transition-colors duration-150 hover:bg-panel-header hover:text-neutral-200"
                  >
                    {copiedPath === f.path ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => void remove(f.path)}
                    title="Borrar"
                    className="rounded p-1.5 text-neutral-500 transition-colors duration-150 hover:bg-panel-header hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Guías */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold text-neutral-200">Lleva el cloud a Internet</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            docs/CLOUD-FREE-2026.md
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Registra Cloudflare (5 min)',
              body: 'Crea tu cuenta gratis, activa Workers/R2 y pega las claves CLOUDFLARE_R2_* en .env. Guía paso a paso en docs/CLOUD-FREE-2026.md.',
            },
            {
              step: '2',
              title: 'Despliega el Worker',
              body: '`npx wrangler deploy` desde cloudflare/ — sube/descarga archivos por R2 con tu dominio .pages.dev, sin pagar egress.',
            },
            {
              step: '3',
              title: 'App reviews (tu negocio)',
              body: 'Meta no exige app review para cuentas propias; X free publica 17 posts/24h; TikTok requiere solicitud de aprobación. Dossier listo en el doc.',
            },
          ].map((g) => (
            <div key={g.step} className="rounded-lg border border-border-subtle bg-panel p-4 transition-colors duration-150 hover:border-border-muted">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 font-mono text-[11px] font-bold text-primary">
                {g.step}
              </span>
              <h3 className="mt-2.5 text-[13px] font-semibold text-neutral-100">{g.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">{g.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}