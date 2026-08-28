'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Brain,
  MessageSquare,
  Image,
  Code,
  Languages,
  BarChart3,
  Mic,
  Music,
  Film,
  Target,
  FileText,
  Palette,
  Minus,
  Maximize2,
  X,
  Eye,
  RotateCcw,
  Play,
  Pause,
  Send,
  Wand2,
  Upload,
  Check,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ThemeId = 'dark' | 'synth' | 'light';

interface CardState {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: string;
  closed: boolean;
  minimized: boolean;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_CARDS: CardState[] = [
  { id: 'textgen', x: 0, y: 0, w: 380, h: 360, accent: '#06b6d4', closed: false, minimized: false },
  { id: 'imggen', x: 400, y: 0, w: 380, h: 360, accent: '#ec4899', closed: false, minimized: false },
  { id: 'codegen', x: 800, y: 0, w: 420, h: 360, accent: '#84cc16', closed: false, minimized: false },
  { id: 'translate', x: 1240, y: 0, w: 360, h: 360, accent: '#f59e0b', closed: false, minimized: false },
  { id: 'sentiment', x: 0, y: 380, w: 380, h: 320, accent: '#84cc16', closed: false, minimized: false },
  { id: 'speech', x: 400, y: 380, w: 380, h: 320, accent: '#ec4899', closed: false, minimized: false },
  { id: 'music', x: 800, y: 380, w: 420, h: 320, accent: '#8b5cf6', closed: false, minimized: false },
  { id: 'video', x: 1240, y: 380, w: 360, h: 320, accent: '#06b6d4', closed: false, minimized: false },
  { id: 'recommend', x: 0, y: 720, w: 450, h: 320, accent: '#06b6d4', closed: false, minimized: false },
  { id: 'summarizer', x: 470, y: 720, w: 450, h: 320, accent: '#8b5cf6', closed: false, minimized: false },
];

const THEME_CONFIG: Record<ThemeId, { bg: string; cardBg: string; cardBorder: string; text: string; label: string; icon: typeof Brain }> = {
  dark: { bg: 'radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%)', cardBg: 'rgba(17,24,39,0.75)', cardBorder: 'rgba(255,255,255,0.12)', text: '#f3f4f6', label: 'Oscuro Neón', icon: Brain },
  synth: { bg: 'radial-gradient(circle at 50% 50%, #2e1065 0%, #0f172a 100%)', cardBg: 'rgba(46,16,101,0.7)', cardBorder: 'rgba(236,72,153,0.3)', text: '#f3f4f6', label: 'Cyberpunk Synth', icon: Brain },
  light: { bg: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', cardBg: 'rgba(255,255,255,0.85)', cardBorder: 'rgba(0,0,0,0.1)', text: '#0f172a', label: 'Claro Tech', icon: Brain },
};

const ACCENT_COLORS = ['#06b6d4', '#ec4899', '#84cc16', '#8b5cf6', '#f59e0b'];

const CARD_META: Record<string, { icon: typeof Brain; title: string; emoji: string }> = {
  textgen: { icon: MessageSquare, title: 'Generador de Texto (LLM Chat)', emoji: '💬' },
  imggen: { icon: Image, title: 'Generador de Imágenes (Diffusion)', emoji: '🖼️' },
  codegen: { icon: Code, title: 'Generador de Código (Copilot)', emoji: '💻' },
  translate: { icon: Languages, title: 'Traducción Neural Multilingüe', emoji: '🌐' },
  sentiment: { icon: BarChart3, title: 'Análisis de Sentimientos', emoji: '📊' },
  speech: { icon: Mic, title: 'Reconocimiento de Voz (Whisper)', emoji: '🎙️' },
  music: { icon: Music, title: 'Generación de Audio & Música', emoji: '🎵' },
  video: { icon: Film, title: 'Edición Neural de Video', emoji: '🎬' },
  recommend: { icon: Target, title: 'Motor de Recomendaciones', emoji: '🎯' },
  summarizer: { icon: FileText, title: 'Resumen Inteligente de Documentos', emoji: '📄' },
};

/* ------------------------------------------------------------------ */
/*  Draggable Card Wrapper                                             */
/* ------------------------------------------------------------------ */

function DraggableCard({
  card,
  onMove,
  onResize,
  children,
}: {
  card: CardState;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, dw: number, dh: number, dx: number, dy: number) => void;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });
  const resizeRef = useRef({ resizing: false, startX: 0, startY: 0 });
  const cardRef_latest = useRef(card);
  cardRef_latest.current = card;

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY };
    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      dragRef.current.startX = ev.clientX;
      dragRef.current.startY = ev.clientY;
      onMove(cardRef_latest.current.id, dx, dy);
    };
    const handleUp = () => {
      dragRef.current.dragging = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [onMove]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { resizing: true, startX: e.clientX, startY: e.clientY };
    const handleMove = (ev: MouseEvent) => {
      if (!resizeRef.current.resizing) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      resizeRef.current.startX = ev.clientX;
      resizeRef.current.startY = ev.clientY;
      onResize(cardRef_latest.current.id, dw, dh, 0, 0);
    };
    const handleUp = () => {
      resizeRef.current.resizing = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [onResize]);

  return (
    <div
      ref={cardRef}
      className="absolute flex flex-col rounded-xl border backdrop-blur-xl transition-[box-shadow,border-color] duration-200"
      style={{
        width: card.w,
        height: card.h,
        transform: `translate(${card.x}px, ${card.y}px)`,
        background: 'var(--dash-card-bg)',
        borderColor: 'var(--dash-card-border)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        zIndex: 10,
        touchAction: 'none',
        ['--card-accent' as string]: card.accent,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 35px -5px rgba(0,0,0,0.6), 0 0 15px ${card.accent}`;
        (e.currentTarget as HTMLElement).style.borderColor = card.accent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--dash-card-border)';
      }}
    >
      {children}
      {/* Resize handle */}
      <div
        className="absolute bottom-0.5 right-0.5 h-3 w-3 cursor-se-resize opacity-50"
        style={{
          borderRight: `2px solid ${card.accent}`,
          borderBottom: `2px solid ${card.accent}`,
        }}
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card Header                                                        */
/* ------------------------------------------------------------------ */

function CardHeader({
  card,
  onDragStart,
  onTogglePicker,
  onMinimize,
  onMaximize,
  onClose,
  onSetAccent,
  showPicker,
}: {
  card: CardState;
  onDragStart: (e: React.MouseEvent) => void;
  onTogglePicker: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  onSetAccent: (color: string) => void;
  showPicker: boolean;
}) {
  const meta = CARD_META[card.id];
  return (
    <>
      <div
        className="flex items-center justify-between border-b px-2.5 py-2"
        style={{ cursor: 'move', borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{meta.emoji}</span>
          <h3 className="text-xs font-semibold tracking-wide text-neutral-200">{meta.title}</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={onTogglePicker} className="rounded p-1 text-neutral-400 hover:text-white transition-colors">
            <Palette className="h-3 w-3" />
          </button>
          <button onClick={onMinimize} className="rounded p-1 text-neutral-400 hover:text-white transition-colors">
            <Minus className="h-3 w-3" />
          </button>
          <button onClick={onMaximize} className="rounded p-1 text-neutral-400 hover:text-white transition-colors">
            <Maximize2 className="h-3 w-3" />
          </button>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:text-red-400 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      {showPicker && (
        <div className="absolute right-2 top-10 z-20 flex space-x-1.5 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl">
          {ACCENT_COLORS.map((c) => (
            <span
              key={c}
              onClick={() => onSetAccent(c)}
              className="block h-5 w-5 cursor-pointer rounded-full hover:scale-110 transition-transform"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual Card Bodies                                             */
/* ------------------------------------------------------------------ */

function TextGenBody() {
  const [messages, setMessages] = useState<string[]>(['¡Hola! Soy un modelo multimodular en tiempo real. ¿En qué te ayudo hoy?']);
  const [input, setInput] = useState('');
  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, input, `Procesando respuesta para "${input}"... Inferencia completada.`]);
    setInput('');
  };
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3 text-xs">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-lg border p-2 ${
              i % 2 === 0
                ? 'border-neutral-700/50 bg-neutral-800/60 text-neutral-300'
                : 'border-cyan-800/50 bg-cyan-950/60 text-right text-cyan-200'
            }`}
          >
            {i % 2 === 0 && <span className="mb-1 block text-xs font-bold text-cyan-400">AI Assistant:</span>}
            {msg}
          </div>
        ))}
      </div>
      <div className="mt-2 flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe un prompt..."
          className="flex-1 rounded border border-neutral-700 bg-neutral-950/70 px-2.5 py-1.5 text-xs text-neutral-200 focus:border-cyan-500 focus:outline-none"
        />
        <button onClick={send} className="rounded bg-cyan-600 px-3 py-1.5 font-medium text-white transition hover:bg-cyan-500">
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ImgGenBody() {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const start = () => {
    setRunning(true);
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += 20;
      setProgress(p);
      if (p >= 100) { clearInterval(iv); setTimeout(() => { setRunning(false); setProgress(0); }, 500); }
    }, 300);
  };
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3 text-xs space-y-2">
      <div className="relative flex-1 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950/80">
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 text-center">
          <Wand2 className="mb-2 h-8 w-8 animate-pulse text-pink-400" />
          <span className="font-mono text-[11px] text-neutral-300">Cyberpunk AI Landscape 8K</span>
        </div>
        {running && (
          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900/90 p-2">
            <div className="mb-1 flex justify-between text-[10px] text-neutral-300">
              <span>Sintetizando difusiones...</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <input type="text" defaultValue="Futuristic Cyberpunk City, neon lights, 8k render" className="flex-1 rounded border border-neutral-700 bg-neutral-950/70 px-2 py-1 text-xs text-neutral-300 focus:outline-none" />
        <button onClick={start} className="flex items-center space-x-1 rounded bg-pink-600 px-3 py-1 font-medium text-white transition hover:bg-pink-500">
          <Play className="h-2.5 w-2.5" /><span>Generar</span>
        </button>
      </div>
    </div>
  );
}

function CodeGenBody() {
  const [code, setCode] = useState(`# AI Code Generation Engine v4\nasync function trainNeuralModel(dataset) {\n  const model = await tf.sequential();\n  model.add(tf.layers.dense({units: 128}));\n  console.log("Model Compiled successfully!");\n}`);
  const stream = () => {
    const snippet = `\n\n// Nueva función autogenerada por IA\nfunction optimizeTensors(matrix) {\n  return matrix.map(row => row.filter(val => val > 0.5));\n}`;
    let i = 0;
    const iv = setInterval(() => {
      setCode((c) => c + snippet[i]);
      i++;
      if (i >= snippet.length) clearInterval(iv);
    }, 20);
  };
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3 text-xs">
      <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950 p-3 font-mono text-[11px] text-emerald-400">
        <pre><code>{code}</code></pre>
      </div>
      <button onClick={stream} className="mt-2 flex w-full items-center justify-center space-x-2 rounded bg-emerald-600 py-1.5 font-medium text-white transition hover:bg-emerald-500">
        <Code className="h-3.5 w-3.5" /><span>Generar Función Async</span>
      </button>
    </div>
  );
}

function TranslateBody() {
  const [text, setText] = useState('La inteligencia artificial está transformando el desarrollo de software.');
  return (
    <div className="flex flex-1 flex-col space-y-2 overflow-hidden p-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span className="font-semibold text-cyan-400">Español</span>
        <ArrowRight className="h-3 w-3" />
        <span className="font-semibold text-pink-400">Inglés</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-24 w-full resize-none rounded border border-neutral-800 bg-neutral-950/70 p-2 text-neutral-200 focus:outline-none"
      />
      <div className="flex-1 rounded border border-neutral-800 bg-neutral-900/60 p-2 font-mono text-amber-300">
        {text ? `[AI Translating...] ${text}` : ''}
      </div>
    </div>
  );
}

function SentimentBody() {
  const [score] = useState(() => Math.floor(Math.random() * 20) + 80);
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden space-y-2 p-3 text-xs">
      <input
        type="text"
        defaultValue="¡Esta nueva plataforma interactiva es increíblemente rápida y fluida!"
        className="rounded border border-neutral-800 bg-neutral-950/70 p-2 text-neutral-200 focus:outline-none"
      />
      <div className="flex items-center justify-around rounded-lg border border-neutral-800 bg-neutral-950/80 p-3">
        <div className="text-center">
          <span className="block text-2xl font-bold text-lime-400">{score}%</span>
          <span className="text-[10px] font-semibold uppercase text-neutral-400">Positivo</span>
        </div>
        <div className="h-10 w-px bg-neutral-800" />
        <div className="w-1/2 space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-300"><span>Felicidad</span><span>92%</span></div>
          <div className="h-1 w-full rounded-full bg-neutral-800"><div className="h-1 rounded-full bg-lime-500" style={{ width: '92%' }} /></div>
          <div className="flex justify-between text-[10px] text-neutral-300"><span>Confianza</span><span>88%</span></div>
          <div className="h-1 w-full rounded-full bg-neutral-800"><div className="h-1 rounded-full bg-cyan-500" style={{ width: '88%' }} /></div>
        </div>
      </div>
    </div>
  );
}

function SpeechBody() {
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3 text-xs">
      <div className="flex items-center justify-center space-x-1.5 rounded-lg border border-neutral-800 bg-neutral-950 p-3 h-16">
        {[1.2, 0.8, 1.5, 1.0, 1.3].map((d, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full animate-pulse"
            style={{
              background: ['#ec4899', '#06b6d4', '#84cc16', '#8b5cf6', '#f59e0b'][i],
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${d}s`,
              height: `${12 + Math.random() * 16}px`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex-1 overflow-y-auto rounded border border-neutral-800 bg-neutral-900/60 p-2 font-mono text-[11px] text-neutral-300">
        [00:04] Transcribiendo entrada de micrófono en tiempo real... &quot;Iniciando secuencia de comandos...&quot;
      </div>
    </div>
  );
}

function MusicBody() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden space-y-2 p-3 text-xs">
      <div className="flex items-center space-x-3 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
        <button
          onClick={() => setPlaying(!playing)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white transition hover:bg-purple-500"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <div className="mb-1 flex justify-between text-[10px] text-neutral-400">
            <span>Synthwave Cyber Track 128BPM</span><span>01:24 / 03:00</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div className={`h-full bg-purple-500 ${playing ? 'w-2/5 animate-pulse' : 'w-2/5'}`} />
          </div>
        </div>
      </div>
      <input type="text" defaultValue="Lo-Fi Ambient beats with relaxing piano" className="rounded border border-neutral-800 bg-neutral-950/70 p-2 text-neutral-300 focus:outline-none" />
    </div>
  );
}

function VideoBody() {
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden p-3 text-xs">
      <div className="relative flex-1 overflow-hidden rounded-lg border border-neutral-800 bg-gradient-to-r from-blue-900 via-indigo-950 to-purple-900">
        <div className="flex h-full items-center justify-center">
          <Film className="h-10 w-10 text-cyan-400/40 animate-bounce" />
        </div>
        <span className="absolute left-2 top-2 rounded bg-red-600/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">REC 4K</span>
      </div>
      <div className="mt-2 flex items-center space-x-2 rounded border border-neutral-800 bg-neutral-950 p-2">
        <Film className="h-3.5 w-3.5 text-neutral-400" />
        <div className="grid flex-1 grid-cols-4 gap-1">
          <div className="h-3 rounded bg-cyan-600/60" />
          <div className="h-3 rounded bg-pink-600/60" />
          <div className="h-3 rounded bg-purple-600/60" />
          <div className="h-3 rounded bg-emerald-600/60" />
        </div>
      </div>
    </div>
  );
}

function RecommendBody() {
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden space-y-2 p-3 text-xs">
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span>Perfil Activo: <strong className="text-cyan-400">Desarrollador AI</strong></span>
        <span className="rounded-full border border-cyan-800 bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300">Precision: 98.4%</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950/80 p-2">
          <div>
            <p className="text-xs font-semibold text-neutral-200">Framework PyTorch 2.4 GPU Kit</p>
            <p className="text-[10px] text-neutral-400">Basado en tu historial de entrenamiento de LLMs</p>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400">99% Match</span>
        </div>
        <div className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950/80 p-2">
          <div>
            <p className="text-xs font-semibold text-neutral-200">Curso: Fine-Tuning de Llama 3</p>
            <p className="text-[10px] text-neutral-400">Recomendado por alta afinidad técnica</p>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-400">94% Match</span>
        </div>
      </div>
    </div>
  );
}

function SummarizerBody() {
  return (
    <div className="flex flex-1 flex-col justify-between overflow-hidden space-y-2 p-3 text-xs">
      <div className="cursor-pointer rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-950/40 p-3 text-center transition hover:border-cyan-500">
        <Upload className="mx-auto mb-1 h-5 w-5 text-cyan-400" />
        <p className="text-sm font-medium text-neutral-300">Arrastra tu PDF / DOCX aquí</p>
        <p className="text-[10px] text-neutral-500">Sintetizado instantáneo mediante RAG</p>
      </div>
      <div className="space-y-1 rounded border border-neutral-800 bg-neutral-950 p-2.5">
        <p className="text-[11px] font-semibold text-neutral-200"><Check className="mr-1 inline h-3 w-3 text-emerald-400" /> Resumen Ejecutivo (3 Puntos Clave):</p>
        <ul className="space-y-0.5 text-[10.5px] text-neutral-400 list-disc list-inside">
          <li>Incremento del 40% en velocidad de inferencia.</li>
          <li>Reducción en latencia con cuantización INT8.</li>
          <li>Integración nativa con pipelines de datos.</li>
        </ul>
      </div>
    </div>
  );
}

const CARD_BODIES: Record<string, () => React.ReactNode> = {
  textgen: TextGenBody,
  imggen: ImgGenBody,
  codegen: CodeGenBody,
  translate: TranslateBody,
  sentiment: SentimentBody,
  speech: SpeechBody,
  music: MusicBody,
  video: VideoBody,
  recommend: RecommendBody,
  summarizer: SummarizerBody,
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function LandingDashboard() {
  const [theme, setTheme] = useState<ThemeId>('dark');
  const [cards, setCards] = useState<CardState[]>(DEFAULT_CARDS);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [maximized, setMaximized] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const themeConf = THEME_CONFIG[theme];

  /* -- Card operations -------------------------------------------- */
  const moveCard = useCallback((id: string, dx: number, dy: number) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, x: c.x + dx, y: c.y + dy } : c)));
  }, []);

  const resizeCard = useCallback((id: string, dw: number, dh: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, w: Math.max(280, c.w + dw), h: Math.max(220, c.h + dh) } : c))
    );
  }, []);

  const minimize = useCallback((id: string) => {
    setMaximized((m) => (m === id ? null : m));
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, minimized: true } : c)));
  }, []);

  const unminimize = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, minimized: false } : c)));
  }, []);

  const close = useCallback((id: string) => {
    setMaximized((m) => (m === id ? null : m));
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, closed: true } : c)));
  }, []);

  const restoreAll = useCallback(() => {
    setCards((prev) => prev.map((c) => ({ ...c, closed: false, minimized: false })));
    setMaximized(null);
  }, []);

  const resetLayout = useCallback(() => {
    setCards(DEFAULT_CARDS);
    setMaximized(null);
  }, []);

  const setAccent = useCallback((id: string, color: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, accent: color } : c)));
    setPickerOpen(null);
  }, []);

  /* -- Close picker on outside click ----------------------------- */
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = () => setPickerOpen(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [pickerOpen]);

  /* -- Visible / dock cards --------------------------------------- */
  const visibleCards = cards.filter((c) => !c.closed && !c.minimized);
  const dockCards = cards.filter((c) => !c.closed && c.minimized);
  const isMaximized = (id: string) => maximized === id;
  const hasMaximized = maximized !== null;

  return (
    <section className="relative overflow-hidden border-b border-border-subtle" id="dashboard-preview">
      {/* CSS variables for card theming */}
      <style>{`
        #dashboard-preview {
          --dash-bg: ${themeConf.bg};
          --dash-card-bg: ${themeConf.cardBg};
          --dash-card-border: ${themeConf.cardBorder};
          --dash-text: ${themeConf.text};
        }
        #dashboard-preview .dash-grid {
          background-size: 40px 40px;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
        }
        @keyframes wave-bar {
          0%, 100% { height: 6px; }
          50% { height: 28px; }
        }
        .wave-bar-anim { animation: wave-bar 1.2s infinite ease-in-out; }
      `}</style>

      {/* Section header */}
      <div className="relative z-20 mx-auto max-w-6xl px-6 pt-16 pb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-panel/60 px-3 py-1 text-xs text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Dashboard Interactivo
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Un lienzo de <span className="gradient-neo-text">10 módulos de IA</span> simultáneos
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
          Arrastra, redimensiona, minimiza y personaliza cada módulo. Temas globales, dock de acceso rápido y simulaciones en tiempo real.
        </p>
      </div>

      {/* Controls bar */}
      <div className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 pb-4">
        <div className="flex items-center space-x-2 rounded-lg border border-border-subtle bg-panel/80 p-1 text-xs">
          {(['dark', 'synth', 'light'] as ThemeId[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded px-2.5 py-1 transition-colors ${
                theme === t ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title={THEME_CONFIG[t].label}
            >
              {t === 'dark' ? '🌙' : t === 'synth' ? '⚡' : '☀️'}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <button onClick={restoreAll} className="flex items-center space-x-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-neutral-200 transition hover:bg-neutral-700">
            <Eye className="h-3 w-3 text-cyan-400" /><span className="hidden sm:inline">Restaurar</span>
          </button>
          <button onClick={resetLayout} className="flex items-center space-x-1.5 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-1.5 text-red-300 transition hover:bg-red-900/60">
            <RotateCcw className="h-3 w-3" /><span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Overlay for maximized */}
      {hasMaximized && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMaximized(null)}
        />
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative mx-auto max-w-[1400px] overflow-hidden px-4 pb-32"
        style={{ background: 'var(--dash-bg)', minHeight: 1080 }}
      >
        <div className="dash-grid absolute inset-0" />

        {visibleCards.map((card) => {
          const Body = CARD_BODIES[card.id];
          const maxed = isMaximized(card.id);
          const style: React.CSSProperties = maxed
            ? {
                position: 'fixed',
                top: 70,
                left: 16,
                right: 16,
                bottom: 80,
                width: 'auto',
                height: 'auto',
                zIndex: 90,
                transform: 'none',
                borderColor: card.accent,
                boxShadow: `0 0 30px ${card.accent}`,
              }
            : {};

          return (
            <div key={card.id} style={maxed ? style : undefined}>
              {maxed ? (
                <div
                  className="flex flex-col rounded-xl border backdrop-blur-xl"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--dash-card-bg)',
                    borderColor: card.accent,
                    boxShadow: `0 0 30px ${card.accent}`,
                    ['--card-accent' as string]: card.accent,
                  }}
                >
                  <CardHeader
                    card={card}
                    onDragStart={() => {}}
                    onTogglePicker={() => setPickerOpen(pickerOpen === card.id ? null : card.id)}
                    onMinimize={() => minimize(card.id)}
                    onMaximize={() => setMaximized(null)}
                    onClose={() => close(card.id)}
                    onSetAccent={(c) => setAccent(card.id, c)}
                    showPicker={pickerOpen === card.id}
                  />
                  <div className="flex-1 overflow-auto">{Body()}</div>
                </div>
              ) : (
                <DraggableCard card={card} onMove={moveCard} onResize={resizeCard}>
                  <CardHeader
                    card={card}
                    onDragStart={() => {}}
                    onTogglePicker={() => setPickerOpen(pickerOpen === card.id ? null : card.id)}
                    onMinimize={() => minimize(card.id)}
                    onMaximize={() => setMaximized(card.id)}
                    onClose={() => close(card.id)}
                    onSetAccent={(c) => setAccent(card.id, c)}
                    showPicker={pickerOpen === card.id}
                  />
                  <div className="flex-1 overflow-auto">{Body()}</div>
                </DraggableCard>
              )}
            </div>
          );
        })}
      </div>

      {/* Dock */}
      {dockCards.length > 0 && (
        <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center space-x-2 rounded-2xl border border-neutral-800 bg-neutral-950/80 px-4 py-2 shadow-2xl backdrop-blur-md">
          <span className="mr-2 border-r border-neutral-800 pr-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Dock</span>
          {dockCards.map((card) => {
            const meta = CARD_META[card.id];
            return (
              <button
                key={card.id}
                onClick={() => unminimize(card.id)}
                className="flex items-center space-x-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs transition hover:bg-neutral-800"
              >
                <span>{meta.emoji}</span>
                <span className="font-medium text-neutral-300">{meta.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active models counter */}
      <div className="absolute right-6 top-4 z-30 hidden items-center space-x-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1 text-xs md:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="font-medium text-neutral-300">10 Modelos Activos</span>
      </div>
    </section>
  );
}
