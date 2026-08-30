'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  ExternalLink,
  Film,
  Music,
  Image as ImageIcon,
  Link2,
  X,
} from 'lucide-react';

/* ── Types ────────────────────────────────────────────────────────────── */

export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaSource {
  /** Direct URL (local /api/media/stream path or remote URL). */
  url: string;
  /** Display title. */
  title?: string;
  /** MIME hint — helps the player choose the right element. */
  mime?: string;
  /** Thumbnail / poster for video. */
  poster?: string;
  /** Duration in seconds (for audio/video). */
  duration?: number;
  /** Source provenance label. */
  source?: 'local' | 'pollinations' | 'meigen' | 'tunetank' | 'edge-tts' | 'url';
}

interface MediaViewerProps {
  source: MediaSource;
  /** Explicitly override the detected kind. */
  kind?: MediaKind;
  /** Compact mode (inline in chat). Default: false (full viewer). */
  compact?: boolean;
  /** Called when the user closes the viewer (overlay mode). */
  onClose?: () => void;
  /** Additional CSS classes. */
  className?: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function detectKind(source: MediaSource, explicit?: MediaKind): MediaKind {
  if (explicit) return explicit;
  const url = source.url.toLowerCase();
  const mime = (source.mime ?? '').toLowerCase();

  if (mime.startsWith('video/') || /\.(mp4|webm|ogg|mov)$/i.test(url)) return 'video';
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(url)) return 'audio';
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(url)) return 'image';

  // YouTube / Vimeo / embed URLs → video
  if (/youtu\.?be|vimeo\.com/i.test(url)) return 'video';

  // Default: if it looks like an image URL (pollinations pattern)
  if (/pollinations\.ai\/prompt/i.test(url)) return 'image';

  return 'video'; // fallback
}

function isEmbedUrl(url: string): boolean {
  return /youtu\.?be|vimeo\.com/i.test(url);
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.?be\/|v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function formatDuration(sec?: number): string {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* ── Video Player ─────────────────────────────────────────────────────── */

function VideoPlayer({ source, compact }: { source: MediaSource; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  }, [duration]);

  // YouTube/Vimeo embed
  if (isEmbedUrl(source.url)) {
    const ytId = extractYoutubeId(source.url);
    const vimeoId = extractVimeoId(source.url);
    if (ytId || vimeoId) {
      const embedSrc = ytId
        ? `https://www.youtube.com/embed/${ytId}?rel=0`
        : `https://player.vimeo.com/video/${vimeoId}?byline=0`;
      return (
        <div className={`relative ${compact ? 'aspect-video' : 'aspect-video'} w-full rounded-lg overflow-hidden bg-black`}>
          <iframe
            src={embedSrc}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={source.title ?? 'Video'}
          />
        </div>
      );
    }
  }

  // HTML5 video player
  return (
    <div className={`relative group ${compact ? '' : 'rounded-lg overflow-hidden'} bg-black`}>
      <video
        ref={videoRef}
        src={source.url}
        poster={source.poster}
        className={`w-full ${compact ? 'max-h-[240px]' : 'max-h-[480px]'} object-contain`}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
        }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) setDuration(v.duration);
        }}
        onEnded={() => setPlaying(false)}
        preload="metadata"
        playsInline
        controls={compact}
      />
      {!compact && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Progress bar */}
          <div className="w-full h-1 bg-white/20 rounded-full cursor-pointer mb-2" onClick={seek}>
            <div className="h-full bg-primary rounded-full transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors" type="button">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={toggleMute} className="text-white hover:text-primary transition-colors" type="button">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="text-[11px] font-mono text-white/60">
              {formatDuration(duration > 0 ? (progress / 100) * duration : undefined)} / {formatDuration(duration)}
            </span>
            <div className="ml-auto flex gap-1">
              <a href={source.url} download className="text-white/60 hover:text-white transition-colors" title="Descargar">
                <Download className="h-3.5 w-3.5" />
              </a>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors" title="Abrir en nueva pestaña">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Audio Player ─────────────────────────────────────────────────────── */

function AudioPlayer({ source, compact }: { source: MediaSource; compact?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  }, []);

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setMuted(a.muted);
  }, []);

  return (
    <div className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-4'} rounded-lg bg-panel border border-border-subtle`}>
      <audio
        ref={audioRef}
        src={source.url}
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a) setDuration(a.duration);
        }}
        onEnded={() => setPlaying(false)}
        preload="metadata"
      />
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        type="button"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      {/* Info + progress */}
      <div className="flex-1 min-w-0">
        {source.title && (
          <p className="text-sm font-medium text-neutral-200 truncate">{source.title}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-border-subtle rounded-full cursor-pointer" onClick={(e) => {
            const a = audioRef.current;
            if (!a || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}>
            <div className="h-full bg-accent-audio rounded-full transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-[10px] font-mono text-neutral-500 shrink-0">
            {formatDuration(duration > 0 ? (progress / 100) * duration : undefined)} / {formatDuration(duration)}
          </span>
        </div>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={toggleMute} className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors" type="button">
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
        <a href={source.url} download className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors" title="Descargar">
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ── Image Viewer ─────────────────────────────────────────────────────── */

function ImageViewer({ source, compact }: { source: MediaSource; compact?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative ${compact ? '' : 'rounded-lg overflow-hidden'} bg-black/50`}>
      {!loaded && !error && (
        <div className={`flex items-center justify-center ${compact ? 'h-[180px]' : 'h-[320px]'}`}>
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className={`flex flex-col items-center justify-center gap-2 ${compact ? 'h-[180px]' : 'h-[320px]'} text-neutral-500`}>
          <ImageIcon className="h-8 w-8" />
          <span className="text-xs">Error al cargar imagen</span>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Abrir en nueva pestaña
          </a>
        </div>
      ) : (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={source.url}
            alt={source.title ?? 'Imagen'}
            className={`w-full ${compact ? 'max-h-[240px]' : 'max-h-[480px]'} object-contain transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
          />
        </a>
      )}
      {loaded && source.title && !compact && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <p className="text-xs text-white/80">{source.title}</p>
          {source.source && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white/60">
              {source.source}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Viewer ──────────────────────────────────────────────────────── */

export function MediaViewer({ source, kind: explicitKind, compact = false, onClose, className }: MediaViewerProps) {
  const kind = detectKind(source, explicitKind);

  const content = (() => {
    switch (kind) {
      case 'video': return <VideoPlayer source={source} compact={compact} />;
      case 'audio': return <AudioPlayer source={source} compact={compact} />;
      case 'image': return <ImageViewer source={source} compact={compact} />;
    }
  })();

  const kindIcon = kind === 'video' ? <Film className="h-3.5 w-3.5" /> :
    kind === 'audio' ? <Music className="h-3.5 w-3.5" /> :
    <ImageIcon className="h-3.5 w-3.5" />;

  const kindLabel = kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : 'Imagen';

  if (compact) {
    return (
      <div className={`rounded-lg border border-border-subtle overflow-hidden ${className ?? ''}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-border-subtle bg-panel overflow-hidden ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-subtle bg-panel-header">
        <span className="text-primary">{kindIcon}</span>
        <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">{kindLabel}</span>
        {source.title && (
          <span className="text-sm text-neutral-200 truncate ml-1">{source.title}</span>
        )}
        {source.source && (
          <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-mono bg-border-subtle text-neutral-500">
            {source.source}
          </span>
        )}
        {onClose && (
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors ml-1" type="button">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* Content */}
      <div className="p-2">{content}</div>
      {/* Footer: source URL */}
      {source.url && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-border-subtle bg-panel-header">
          <Link2 className="h-3 w-3 text-neutral-600" />
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-neutral-500 hover:text-primary truncate max-w-[90%] transition-colors"
          >
            {source.url}
          </a>
        </div>
      )}
    </div>
  );
}

/* ── MediaGallery: grid of multiple media items ───────────────────────── */

export interface MediaGalleryItem {
  source: MediaSource;
  kind?: MediaKind;
}

export function MediaGallery({ items, compact }: { items: MediaGalleryItem[]; compact?: boolean }) {
  if (items.length === 0) return null;
  if (items.length === 1) {
    return <MediaViewer source={items[0].source} kind={items[0].kind} compact={compact} />;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item, i) => (
        <MediaViewer key={`${item.source.url}-${i}`} source={item.source} kind={item.kind} compact={compact} />
      ))}
    </div>
  );
}
