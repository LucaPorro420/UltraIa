'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Video,
  MessageSquare,
  Hash,
  Clock,
  BarChart3,
  Loader2,
  ChevronRight,
  Download,
  ArrowLeft,
  Globe,
} from 'lucide-react';

type ContentFile = {
  path: string;
  meta: {
    type: string;
    sourceId: string;
    title: string;
    idioma: string;
    wordCount: number;
    estimatedReadMin: number;
    tags: string[];
  };
};

type ContentStats = {
  totalManifests: number;
  totalFiles: number;
  totalWords: number;
  byType: Record<string, { count: number; words: number }>;
  byIdioma: Record<string, { count: number; words: number }>;
  bySource: Record<string, { count: number; words: number; title: string }>;
};

type ContentFileDetail = ContentFile & {
  body: string;
  raw: string;
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  'blog-post': FileText,
  'video-script': Video,
  'social-caption': MessageSquare,
  'thread': Hash,
};

const TYPE_LABELS: Record<string, string> = {
  'blog-post': 'Blog Post',
  'video-script': 'Guión de Video',
  'social-caption': 'Caption Redes',
  'thread': 'Hilo X/Twitter',
};

export function ContentHistoryClient() {
  const [files, setFiles] = useState<ContentFile[]>([]);
  const [stats, setStats] = useState<ContentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentFileDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/content/list');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error loading content');
        return;
      }
      setFiles(data.files);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (filePath: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/content/list?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (res.ok) {
        setSelected(data.file);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownload = (file: ContentFileDetail) => {
    const ext = file.meta.type === 'blog-post' || file.meta.type === 'video-script' ? '.md' : '.txt';
    const filename = `${file.meta.sourceId}-${file.meta.type}-${file.meta.idioma}${ext}`;
    const blob = new Blob([file.raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Detail view
  if (selected) {
    const Icon = TYPE_ICONS[selected.meta.type] || FileText;
    return (
      <div className="min-h-screen bg-canvas">
        <main className="mx-auto max-w-4xl px-6 py-12">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al historial
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white">{selected.meta.title}</h1>
                <p className="text-xs text-neutral-500">
                  {TYPE_LABELS[selected.meta.type] || selected.meta.type} ·{' '}
                  {selected.meta.idioma === 'es' ? 'Español' : 'العربية'} ·{' '}
                  {selected.meta.wordCount} palabras · ~{selected.meta.estimatedReadMin} min
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDownload(selected)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
          </div>

          {selected.meta.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {selected.meta.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-panel px-2 py-0.5 text-[10px] text-neutral-400 border border-border-subtle"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border-subtle bg-panel p-6">
            <div className="prose prose-invert prose-sm max-w-none">
              {selected.body.split('\n').map((line, i) => {
                if (line.startsWith('# ')) {
                  return <h1 key={i} className="text-xl font-bold text-white mt-0">{line.slice(2)}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={i} className="text-lg font-semibold text-neutral-100 mt-6">{line.slice(3)}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={i} className="text-base font-semibold text-neutral-200 mt-4">{line.slice(4)}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={i} className="text-sm text-neutral-300 ml-4">{line.slice(2)}</li>;
                }
                if (line.trim() === '') {
                  return <div key={i} className="h-2" />;
                }
                return <p key={i} className="text-sm text-neutral-300 leading-relaxed">{line}</p>;
              })}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          content engine
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
          Historial de <span className="gradient-neo-text">Contenido</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Contenido generado desde ebooks y cursos. Visualiza, descarga o continua generando.
        </p>

        {/* Stats */}
        {stats && stats.totalFiles > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border-subtle bg-panel p-3">
              <div className="text-2xl font-bold text-white">{stats.totalFiles}</div>
              <div className="text-xs text-neutral-500">Archivos</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-panel p-3">
              <div className="text-2xl font-bold text-white">{stats.totalWords.toLocaleString()}</div>
              <div className="text-xs text-neutral-500">Palabras</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-panel p-3">
              <div className="text-2xl font-bold text-white">{Object.keys(stats.byType).length}</div>
              <div className="text-xs text-neutral-500">Tipos</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-panel p-3">
              <div className="text-2xl font-bold text-white">{Object.keys(stats.byIdioma).length}</div>
              <div className="text-xs text-neutral-500">Idiomas</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Files */}
        {files.length > 0 ? (
          <div className="mt-6 space-y-2">
            {files.map((file) => {
              const Icon = TYPE_ICONS[file.meta.type] || FileText;
              return (
                <button
                  key={file.path}
                  onClick={() => loadDetail(file.path)}
                  className="w-full flex items-center gap-3 rounded-lg border border-border-subtle bg-panel p-3 text-left transition-colors hover:bg-panel-hover group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-200 truncate group-hover:text-white">
                      {file.meta.title || file.path}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <span>{TYPE_LABELS[file.meta.type] || file.meta.type}</span>
                      <span>·</span>
                      <Globe className="h-2.5 w-2.5" />
                      <span>{file.meta.idioma}</span>
                      <span>·</span>
                      <Clock className="h-2.5 w-2.5" />
                      <span>{file.meta.wordCount} palabras</span>
                      <span>·</span>
                      <span>~{file.meta.estimatedReadMin} min</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-panel">
              <BarChart3 className="h-8 w-8 text-neutral-600" />
            </div>
            <p className="text-sm text-neutral-500">No hay contenido generado todavía.</p>
            <a
              href="/content"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Generar contenido
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
