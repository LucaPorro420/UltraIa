'use client';

import { useState } from 'react';
import { Loader2, FileText, Video, MessageSquare, Hash, ChevronDown, ChevronUp } from 'lucide-react';

type Source = {
  id: string;
  title: string;
  category: string;
  level: string;
  topics: string[];
  chapters: number;
  lessons: number;
};

type ContentType = 'blog-post' | 'video-script' | 'social-caption' | 'thread';
type Idioma = 'es' | 'ar';

type GeneratedResult = {
  sourceId: string;
  sourceTitle: string;
  type: ContentType;
  idioma: Idioma;
  files: {
    path: string;
    content: {
      type: string;
      title: string;
      body: string;
      tags: string[];
      wordCount: number;
      estimatedReadMin: number;
    };
  }[];
  manifestPath: string;
};

const TYPE_INFO: Record<ContentType, { label: string; icon: typeof FileText; desc: string }> = {
  'blog-post': { label: 'Blog Post', icon: FileText, desc: 'Artículo Markdown para blog' },
  'video-script': { label: 'Guión de Video', icon: Video, desc: 'Script 60s para YouTube Shorts / TikTok' },
  'social-caption': { label: 'Caption Redes', icon: MessageSquare, desc: 'Caption ≤280 chars para X/Instagram' },
  'thread': { label: 'Hilo X/Twitter', icon: Hash, desc: 'Thread de 5 tweets' },
};

export function ContentClient({ sources }: { sources: Source[] }) {
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ContentType>('blog-post');
  const [idioma, setIdioma] = useState<Idioma>('es');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(true);

  const handleGenerate = async () => {
    if (!selectedSource) {
      setError('Selecciona una fuente');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: selectedSource,
          type: selectedType,
          idioma,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error generando contenido');
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          types: ['blog-post', 'video-script', 'social-caption', 'thread'],
          idiomas: [idioma],
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error en batch generation');
        return;
      }

      // Show summary for batch
      setResult({
        sourceId: 'batch',
        sourceTitle: `${data.totalFiles} archivos generados`,
        type: 'blog-post',
        idioma,
        files: data.sources.flatMap((s: GeneratedResult) =>
          s.files.map((f) => ({
            ...f,
            content: {
              ...f.content,
              title: `[${s.sourceTitle}] ${f.content.title}`,
            },
          }))
        ),
        manifestPath: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const source = sources.find((s) => s.id === selectedSource);

  return (
    <div className="min-h-screen bg-canvas">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          content engine
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">
          Generador de <span className="gradient-neo-text">Contenido</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Genera contenido derivado (blog, guiones, captions, hilos) desde ebooks y cursos.
          Determinista, keyless, bilingüe es/ar.
        </p>

        {/* Controls */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Source selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Fuente</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-panel px-3 py-2 text-sm text-neutral-200 focus:border-primary focus:outline-none"
            >
              <option value="">Seleccionar fuente...</option>
              <optgroup label="Ebooks">
                {sources.filter((s) => s.id.startsWith('ebook')).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </optgroup>
              <optgroup label="Cursos">
                {sources.filter((s) => s.id.startsWith('course')).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TYPE_INFO) as ContentType[]).map((type) => {
                const info = TYPE_INFO[type];
                const Icon = info.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-primary text-white'
                        : 'border border-border-subtle bg-panel text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Idioma */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Idioma</label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setIdioma('es')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  idioma === 'es'
                    ? 'bg-primary text-white'
                    : 'border border-border-subtle bg-panel text-neutral-400 hover:text-white'
                }`}
              >
                🇪🇸 Español
              </button>
              <button
                onClick={() => setIdioma('ar')}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  idioma === 'ar'
                    ? 'bg-primary text-white'
                    : 'border border-border-subtle bg-panel text-neutral-400 hover:text-white'
                }`}
              >
                🇸🇦 العربية
              </button>
            </div>
          </div>

          {/* Actions */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">Acciones</label>
            <div className="flex gap-1.5">
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedSource}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Generar
              </button>
              <button
                onClick={handleBatchGenerate}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle bg-panel px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white disabled:opacity-50"
              >
                Batch
              </button>
            </div>
          </div>
        </div>

        {/* Source info */}
        {source && (
          <div className="mt-4 rounded-lg border border-border-subtle bg-panel p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-neutral-100">{source.title}</h3>
                <p className="text-xs text-neutral-500">
                  {source.category} · {source.level} · {source.topics.join(', ')}
                </p>
              </div>
              <div className="text-right text-xs text-neutral-500">
                {source.chapters > 0 && <div>{source.chapters} capítulos</div>}
                {source.lessons > 0 && <div>{source.lessons} lecciones</div>}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-6">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {result.files.length} archivo(s) generado(s) — {result.files.reduce((sum, f) => sum + f.content.wordCount, 0)} palabras
            </button>

            {expanded && (
              <div className="mt-3 space-y-3">
                {result.files.map((file, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border-subtle bg-panel overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = TYPE_INFO[file.content.type as ContentType]?.icon || FileText;
                          return <Icon className="h-3.5 w-3.5 text-primary" />;
                        })()}
                        <span className="text-xs font-medium text-neutral-200">{file.content.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                        <span>{file.content.wordCount} palabras</span>
                        <span>~{file.content.estimatedReadMin} min</span>
                        <span>{file.content.tags.slice(0, 3).join(', ')}</span>
                      </div>
                    </div>
                    <pre className="p-4 text-xs text-neutral-300 overflow-x-auto max-h-96 font-mono whitespace-pre-wrap">
                      {file.content.body}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="mt-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-panel">
              <FileText className="h-8 w-8 text-neutral-600" />
            </div>
            <p className="text-sm text-neutral-500">
              Selecciona una fuente y un tipo de contenido para generar.
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              {sources.length} fuentes disponibles · {Object.keys(TYPE_INFO).length} tipos de contenido · 2 idiomas
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
