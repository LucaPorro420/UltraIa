'use client';

import { useCallback, useRef, useState } from 'react';
import { Link2, Upload, FileJson, X, Film, Music, Image as ImageIcon, Clipboard } from 'lucide-react';
import type { MediaSource, MediaKind } from './media-viewer';

interface MediaInputProps {
  /** Called when the user submits one or more media sources. */
  onSources: (sources: MediaSource[]) => void;
  /** Accepted kinds for filtering. */
  accept?: MediaKind[];
  /** Show as inline (within chat) or as a standalone panel. */
  inline?: boolean;
}

type InputMode = 'url' | 'json' | 'upload';

const KIND_ICONS: Record<MediaKind, typeof Film> = {
  video: Film,
  audio: Music,
  image: ImageIcon,
};

function detectMediaKind(url: string): MediaKind {
  const u = url.toLowerCase();
  if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(u) || /youtu\.?be|vimeo\.com/i.test(u)) return 'video';
  if (/\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(u)) return 'audio';
  return 'image';
}

function parseMediaJson(json: string): MediaSource[] {
  try {
    const parsed = JSON.parse(json);

    // Single object
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const items = parsed.media ?? parsed.sources ?? parsed.assets ?? [parsed];
      return (Array.isArray(items) ? items : [items])
        .filter((item: Record<string, unknown>) => item && typeof item.url === 'string')
        .map((item: Record<string, unknown>) => ({
          url: String(item.url),
          title: (item.title as string) ?? (item.name as string) ?? undefined,
          mime: (item.mime as string) ?? (item.type as string) ?? undefined,
          poster: (item.poster as string) ?? (item.thumbnail as string) ?? undefined,
          duration: typeof item.duration === 'number' ? item.duration : undefined,
          source: 'url' as const,
        }));
    }

    // Array of objects
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item: Record<string, unknown>) => item && typeof item.url === 'string')
        .map((item: Record<string, unknown>) => ({
          url: String(item.url),
          title: (item.title as string) ?? (item.name as string) ?? undefined,
          mime: (item.mime as string) ?? (item.type as string) ?? undefined,
          poster: (item.poster as string) ?? (item.thumbnail as string) ?? undefined,
          duration: typeof item.duration === 'number' ? item.duration : undefined,
          source: 'url' as const,
        }));
    }

    return [];
  } catch {
    return [];
  }
}

export function MediaInput({ onSources, accept, inline = false }: MediaInputProps) {
  const [mode, setMode] = useState<InputMode>('url');
  const [urlValue, setUrlValue] = useState('');
  const [jsonValue, setJsonValue] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitUrl = useCallback(() => {
    const url = urlValue.trim();
    if (!url) return;
    const kind = detectMediaKind(url);
    if (accept && !accept.includes(kind)) return;
    onSources([{ url, source: 'url', title: url.split('/').pop() }]);
    setUrlValue('');
  }, [urlValue, accept, onSources]);

  const submitJson = useCallback(() => {
    setJsonError('');
    const sources = parseMediaJson(jsonValue);
    if (sources.length === 0) {
      setJsonError('No se encontraron fuentes válidas. Esperaba { url: "..." } o [ { url: "..." } ].');
      return;
    }
    const filtered = accept ? sources.filter((s) => accept.includes(detectMediaKind(s.url))) : sources;
    if (filtered.length === 0) {
      setJsonError(`Ninguna fuente coincide con los tipos aceptados: ${accept?.join(', ')}`);
      return;
    }
    onSources(filtered);
    setJsonValue('');
  }, [jsonValue, accept, onSources]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const result: MediaSource[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const kind = detectMediaKind(file.name);
      if (accept && !accept.includes(kind)) continue;
      result.push({
        url,
        title: file.name,
        mime: file.type || undefined,
        source: 'local',
      });
    }
    if (result.length > 0) onSources(result);
  }, [accept, onSources]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Try JSON first
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        setJsonValue(text.trim());
        setMode('json');
        return;
      }
      // Otherwise treat as URL
      if (text.trim().startsWith('http')) {
        setUrlValue(text.trim());
        setMode('url');
      }
    } catch {
      // Clipboard API not available
    }
  }, []);

  if (inline) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded text-neutral-500 hover:text-primary hover:bg-panel-hover transition-colors"
          title="Subir archivo"
          type="button"
        >
          <Upload className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handlePaste}
          className="p-1.5 rounded text-neutral-500 hover:text-primary hover:bg-panel-hover transition-colors"
          title="Pegar desde portapapeles"
          type="button"
        >
          <Clipboard className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-panel overflow-hidden">
      {/* Mode tabs */}
      <div className="flex border-b border-border-subtle bg-panel-header">
        {([['url', 'URL', Link2], ['json', 'JSON', FileJson], ['upload', 'Archivo', Upload]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono transition-colors ${
              mode === m ? 'text-primary border-b-2 border-primary' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center pr-3">
          <button onClick={handlePaste} className="text-[10px] text-neutral-600 hover:text-primary transition-colors flex items-center gap-1" type="button">
            <Clipboard className="h-3 w-3" />
            Pegar
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* URL mode */}
        {mode === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitUrl()}
                placeholder="https://example.com/video.mp4 o https://youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 rounded-lg bg-input border border-border-subtle text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-border-active transition-colors"
              />
              <button onClick={submitUrl} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors" type="button">
                Agregar
              </button>
            </div>
            <p className="text-[11px] text-neutral-600">
              Soporta: YouTube, Vimeo, URLs directas de video/audio/imagen, Pollinations, Tunetank, edge-tts.
            </p>
          </div>
        )}

        {/* JSON mode */}
        {mode === 'json' && (
          <div className="space-y-3">
            <textarea
              value={jsonValue}
              onChange={(e) => { setJsonValue(e.target.value); setJsonError(''); }}
              placeholder={`{\n  "url": "https://example.com/video.mp4",\n  "title": "Mi video",\n  "type": "video/mp4"\n}\n\no un array:\n[\n  { "url": "https://...", "title": "..." },\n  { "url": "https://...", "title": "..." }\n]`}
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-input border border-border-subtle text-sm text-neutral-200 font-mono placeholder:text-neutral-600 focus:outline-none focus:border-border-active transition-colors resize-none"
            />
            {jsonError && (
              <p className="text-xs text-red-400">{jsonError}</p>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-neutral-600">
                Acepta: {'{ "url": "..." }'}, {'{ "media": [...] }'}, {'{ "sources": [...] }'}, o un array directo.
              </p>
              <button onClick={submitJson} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors" type="button">
                Parsear
              </button>
            </div>
          </div>
        )}

        {/* Upload mode */}
        {mode === 'upload' && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-3 py-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border-subtle hover:border-border-muted'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <Upload className={`h-8 w-8 ${dragOver ? 'text-primary' : 'text-neutral-600'}`} />
            <div className="text-center">
              <p className="text-sm text-neutral-300">
                {dragOver ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
              </p>
              <p className="text-[11px] text-neutral-600 mt-1">
                Videos, audio, imágenes — se abren localmente vía Object URL
              </p>
            </div>
            {/* Supported format badges */}
            <div className="flex flex-wrap gap-1 mt-1">
              {['MP4', 'WebM', 'MP3', 'WAV', 'OGG', 'PNG', 'JPG', 'WebP', 'GIF'].map((fmt) => (
                <span key={fmt} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-border-subtle text-neutral-500">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
