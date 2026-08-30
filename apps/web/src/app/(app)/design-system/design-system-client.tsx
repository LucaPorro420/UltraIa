'use client';

/**
 * DesignSystemClient — página principal del sistema de diseño.
 * Combina el theme customizer con un showcase interactivo de todos
 * los componentes, un preview responsive con resize por drag,
 * un editor CSS live, y un playground de componentes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Palette,
  Monitor,
  Tablet,
  Smartphone,
  GripVertical,
  Maximize2,
  Layout,
  Code2,
  Play,
  Copy,
  Check,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useTheme } from '@/components/ide/theme-provider';
import { ThemeCustomizer } from '@/components/ide/theme-customizer';
import { THEME_PRESETS, generateCssVariables, TOKEN_LABELS, type ThemeTokens } from '@/components/ide/theme-engine';

/* ── Responsive Preview Panel ─────────────────────────────────────────── */

type ViewportSize = 'desktop' | 'tablet' | 'mobile' | 'custom';

const VIEWPORT_PRESETS: Record<ViewportSize, { width: number; height: number; label: string }> = {
  desktop: { width: 1280, height: 800, label: 'Desktop' },
  tablet: { width: 768, height: 1024, label: 'Tablet' },
  mobile: { width: 375, height: 812, label: 'Móvil' },
  custom: { width: 800, height: 600, label: 'Custom' },
};

function ResponsivePreview() {
  const { tokens } = useTheme();
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [customSize, setCustomSize] = useState({ width: 800, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<'right' | 'bottom' | 'corner' | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const size = viewport === 'custom' ? customSize : VIEWPORT_PRESETS[viewport];

  const handleResizeStart = useCallback(
    (edge: 'right' | 'bottom' | 'corner') => (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      setResizeEdge(edge);
      startPos.current = { x: e.clientX, y: e.clientY, w: size.width, h: size.height };
    },
    [size],
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      const s = startPos.current;
      setCustomSize({
        width: Math.max(300, Math.min(1920, s.w + (resizeEdge === 'bottom' ? 0 : dx))),
        height: Math.max(200, Math.min(1080, s.h + (resizeEdge === 'right' ? 0 : dy))),
      });
    };
    const onUp = () => { setIsResizing(false); setResizeEdge(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isResizing, resizeEdge]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <Monitor className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Vista Previa Responsive
        </span>
        <div className="ml-auto flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile', 'custom'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewport(v)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors duration-150 ${
                viewport === v ? 'bg-primary/20 text-primary' : 'text-neutral-500 hover:bg-panel-hover hover:text-neutral-300'
              }`}
            >
              {v === 'desktop' && <Monitor className="h-3 w-3" />}
              {v === 'tablet' && <Tablet className="h-3 w-3" />}
              {v === 'mobile' && <Smartphone className="h-3 w-3" />}
              {v === 'custom' && <Maximize2 className="h-3 w-3" />}
              <span className="hidden sm:inline">{VIEWPORT_PRESETS[v].label}</span>
            </button>
          ))}
          <span className="ml-2 font-mono text-[10px] text-neutral-600">
            {size.width} × {size.height}
          </span>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-[#1a1a2e] p-4">
        <div
          ref={previewRef}
          className="relative mx-auto overflow-hidden rounded-lg border border-border-subtle shadow-2xl transition-[width,height] duration-300"
          style={{ width: size.width, height: size.height, maxWidth: '100%' }}
        >
          {/* Mini IDE shell preview */}
          <div className="flex h-full" style={{ background: tokens.canvas }}>
            {/* Rail */}
            <div
              className="flex shrink-0 flex-col items-center gap-1 border-r py-2"
              style={{ width: tokens.ideActivitybarWidth, borderColor: tokens.borderSubtle, background: tokens.panel }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-[9px] font-bold text-white"
                style={{ background: tokens.gradientPrimary }}
              >
                UI
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-7 w-7 rounded-md" style={{ background: i === 1 ? tokens.panelHover : 'transparent' }} />
              ))}
            </div>

            {/* Sidebar */}
            <div
              className="shrink-0 border-r overflow-hidden"
              style={{ width: Math.min(parseInt(tokens.ideSidebarWidth), size.width * 0.3), borderColor: tokens.borderSubtle, background: tokens.panel }}
            >
              <div className="flex h-[28px] items-center border-b px-2" style={{ borderColor: tokens.borderSubtle }}>
                <span className="font-mono text-[9px] font-semibold uppercase" style={{ color: tokens.muted }}>
                  Ultra<span style={{ color: tokens.primary }}>Ia</span>
                </span>
              </div>
              <div className="p-2 space-y-1">
                {['Dashboard', 'Studio', 'Gallery', 'Builder', 'Editor'].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded px-2 py-1"
                    style={{ background: i === 0 ? tokens.panelHover : 'transparent', color: i === 0 ? tokens.foreground : tokens.muted }}
                  >
                    <div className="h-3 w-3 rounded" style={{ background: tokens.muted + '40' }} />
                    <span className="text-[10px]">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden" style={{ background: tokens.canvas }}>
              <div className="flex h-[32px] items-center border-b px-3" style={{ borderColor: tokens.borderSubtle, background: tokens.panelHeader }}>
                <span className="text-[10px] font-medium" style={{ color: tokens.foreground }}>Dashboard</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${size.width > 600 ? 3 : 1}, 1fr)` }}>
                  {[tokens.primary, tokens.agentVideo, tokens.agentAudio].map((color, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
                      <div className="mb-2 h-2 w-12 rounded" style={{ background: color }} />
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded" style={{ background: tokens.muted + '30' }} />
                        <div className="h-1.5 w-3/4 rounded" style={{ background: tokens.muted + '20' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg p-3" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
                  <p className="text-xs font-medium" style={{ color: tokens.foreground }}>Vista previa del tema</p>
                  <p className="mt-1 text-[10px]" style={{ color: tokens.muted }}>Todos los colores se actualizan en tiempo real.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resize handles */}
          {viewport === 'custom' && (
            <>
              <div className="absolute right-0 top-0 h-full w-1 cursor-e-resize hover:bg-primary/50 transition-colors" onMouseDown={handleResizeStart('right')} />
              <div className="absolute bottom-0 left-0 h-1 w-full cursor-s-resize hover:bg-primary/50 transition-colors" onMouseDown={handleResizeStart('bottom')} />
              <div className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize hover:bg-primary/50 transition-colors" onMouseDown={handleResizeStart('corner')} />
              <div className="absolute bottom-1 right-1 text-neutral-600">
                <GripVertical className="h-3 w-3 rotate-[-45deg]" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── CSS Editor Panel ─────────────────────────────────────────────────── */

function CssEditor() {
  const { tokens, exportCss } = useTheme();
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'surfaces' | 'colors' | 'typography' | 'effects'>('all');
  const css = exportCss();

  const sections = {
    all: css,
    surfaces: css.split('\n').filter(l => l.includes('--color-canvas') || l.includes('--color-panel') || l.includes('--color-border') || l.includes('--color-primary') || l.includes('--color-accent') || l.includes('--color-destructive')).join('\n'),
    colors: css.split('\n').filter(l => l.includes('--agent-') || l.includes('--status-') || l.includes('--color-neo')).join('\n'),
    typography: css.split('\n').filter(l => l.includes('--font-') || l.includes('--font-size') || l.includes('--line-height') || l.includes('--letter-spacing') || l.includes('--spacing')).join('\n'),
    effects: css.split('\n').filter(l => l.includes('--glow') || l.includes('--shadow') || l.includes('--gradient') || l.includes('--glass') || l.includes('--border-opacity') || l.includes('--animation') || l.includes('--easing') || l.includes('--transition') || l.includes('--scrollbar') || l.includes('--opacity') || l.includes('--radius') || l.includes('--border-width')).join('\n'),
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(sections[activeSection]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const tokenCount = css.split('\n').filter(l => l.startsWith('  --')).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <Code2 className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          CSS Variables
        </span>
        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-mono text-primary">
          {tokenCount}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={copyAll} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Section filter */}
      <div className="flex border-b border-border-subtle">
        {(['all', 'surfaces', 'colors', 'typography', 'effects'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setActiveSection(s)}
            className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
              activeSection === s ? 'border-b-2 border-primary text-primary' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {s === 'all' ? 'Todo' : s === 'surfaces' ? 'Superficies' : s === 'colors' ? 'Colores' : s === 'typography' ? 'Tipografía' : 'Efectos'}
          </button>
        ))}
      </div>

      {/* CSS output */}
      <div className="flex-1 overflow-auto bg-canvas p-4">
        <pre className="font-mono text-[11px] leading-relaxed text-neutral-400 whitespace-pre-wrap">
          {sections[activeSection]}
        </pre>
      </div>

      {/* Live token grid */}
      <div className="border-t border-border-subtle p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Tokens activos</p>
        <div className="grid grid-cols-8 gap-1">
          {(['primary', 'accent', 'destructive', 'agentVideo', 'agentAudio', 'agentText', 'agentCode', 'agentWeb'] as const).map((k) => (
            <div key={k} className="flex flex-col items-center gap-1">
              <div className="h-6 w-full rounded" style={{ background: tokens[k] }} />
              <span className="text-[8px] text-neutral-500">{TOKEN_LABELS[k].replace('Agente ', '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Component Showcase ───────────────────────────────────────────────── */

function ComponentShowcase() {
  const { tokens } = useTheme();

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="font-display text-sm font-bold" style={{ color: tokens.foreground }}>Componentes UI</h3>
        <p className="text-[10px] mt-1" style={{ color: tokens.muted }}>Todos los componentes se adaptan al tema activo.</p>
      </div>

      {/* Buttons */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Botones</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-md px-4 py-2 text-xs font-medium text-white transition-all duration-200" style={{ background: tokens.primary }}>Primario</button>
          <button type="button" className="rounded-md px-4 py-2 text-xs font-medium transition-all duration-200" style={{ border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}`, color: tokens.foreground, background: tokens.panel }}>Secundario</button>
          <button type="button" className="rounded-md px-4 py-2 text-xs font-medium text-white transition-all duration-200" style={{ background: tokens.destructive }}>Destructivo</button>
          <button type="button" className="rounded-md px-4 py-2 text-xs font-medium text-white transition-all duration-200" style={{ background: tokens.accent }}>Acento</button>
          <button type="button" className="rounded-md px-4 py-2 text-xs font-medium text-white transition-all duration-200" style={{ background: tokens.gradientPrimary }}>Gradiente</button>
        </div>
      </div>

      {/* Agent modality badges */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Modalidades de Agente</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Video', color: tokens.agentVideo },
            { label: 'Audio', color: tokens.agentAudio },
            { label: 'Texto', color: tokens.agentText },
            { label: 'Código', color: tokens.agentCode },
            { label: 'Web', color: tokens.agentWeb },
          ].map((m) => (
            <span key={m.label} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium" style={{ background: m.color + '20', color: m.color, border: `1px solid ${m.color}40` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      {/* Status indicators */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Estados</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Thinking', color: tokens.statusThinking },
            { label: 'Streaming', color: tokens.statusStreaming },
            { label: 'Error', color: tokens.statusError },
            { label: 'Success', color: tokens.statusSuccess },
            { label: 'Warning', color: tokens.statusWarning },
            { label: 'Pending', color: tokens.statusPending },
            { label: 'Fail', color: tokens.statusFail },
          ].map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[10px]" style={{ color: tokens.foreground }}>
              <span className="h-2 w-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Tipografía</p>
        <div className="space-y-2">
          <p style={{ fontFamily: tokens.fontFamilyDisplay, color: tokens.foreground, fontSize: '24px', fontWeight: 700 }}>Display Heading</p>
          <p style={{ fontFamily: tokens.fontFamilySans, color: tokens.foreground, fontSize: tokens.fontSizeBase, lineHeight: tokens.lineHeightBase }}>
            Body text — Inter for functional UI. The quick brown fox jumps over the lazy dog.
          </p>
          <p style={{ fontFamily: tokens.fontFamilyMono, color: tokens.muted, fontSize: '12px' }}>
            JetBrains Mono — const cmd = &quot;ultraia create agent&quot;;
          </p>
        </div>
      </div>

      {/* Input fields */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Inputs</p>
        <div className="space-y-2">
          <input type="text" placeholder="Escribe algo..." className="w-full rounded-md px-3 py-2 text-xs outline-none" style={{ background: tokens.inputActive, border: `${tokens.borderWidthSm} solid ${tokens.borderMuted}`, color: tokens.foreground }} />
          <textarea placeholder="Textarea de ejemplo..." rows={2} className="w-full rounded-md px-3 py-2 text-xs outline-none resize-none" style={{ background: tokens.inputActive, border: `${tokens.borderWidthSm} solid ${tokens.borderMuted}`, color: tokens.foreground }} />
          <div className="flex gap-2">
            <select className="rounded-md px-3 py-2 text-xs outline-none" style={{ background: tokens.inputActive, border: `${tokens.borderWidthSm} solid ${tokens.borderMuted}`, color: tokens.foreground }}>
              <option>Opción 1</option>
              <option>Opción 2</option>
            </select>
            <button type="button" className="rounded-md px-4 py-2 text-xs font-medium text-white" style={{ background: tokens.primary }}>Enviar</button>
          </div>
        </div>
      </div>

      {/* Cards with glow */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Cards con Glow</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Video', color: tokens.agentVideo, icon: '🎬' },
            { label: 'Audio', color: tokens.agentAudio, icon: '🎵' },
            { label: 'Código', color: tokens.agentCode, icon: '💻' },
            { label: 'Web', color: tokens.agentWeb, icon: '🌐' },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-lg p-3 transition-all duration-150 hover:translate-y-[-2px]"
              style={{ background: tokens.panelHeader, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}`, boxShadow: `0 0 18px -6px ${c.color}` }}
            >
              <span className="text-lg">{c.icon}</span>
              <p className="mt-1 text-[10px] font-medium" style={{ color: tokens.foreground }}>{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Borders & Radius showcase */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Bordes y Radios</p>
        <div className="flex gap-2">
          <div className="h-12 w-12 bg-primary/20" style={{ borderRadius: tokens.radiusSm, border: `${tokens.borderWidthSm} solid ${tokens.primary}` }} />
          <div className="h-12 w-12 bg-primary/20" style={{ borderRadius: tokens.radiusMd, border: `${tokens.borderWidthMd} solid ${tokens.primary}` }} />
          <div className="h-12 w-12 bg-primary/20" style={{ borderRadius: tokens.radiusLg, border: `${tokens.borderWidthLg} solid ${tokens.primary}` }} />
          <div className="h-12 w-12 bg-primary/20" style={{ borderRadius: tokens.radiusXl, border: `${tokens.borderWidthMd} solid ${tokens.primary}` }} />
        </div>
      </div>

      {/* Gradients showcase */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Gradientes</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-lg" style={{ background: tokens.gradientPrimary }} />
          <div className="h-10 rounded-lg" style={{ background: tokens.gradientAccent }} />
          <div className="h-10 rounded-lg" style={{ background: tokens.gradientAgent }} />
          <div className="h-10 rounded-lg" style={{ background: tokens.gradientPanel }} />
        </div>
      </div>

      {/* Shadows showcase */}
      <div className="rounded-lg p-4" style={{ background: tokens.panel, border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}` }}>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: tokens.muted }}>Sombras</p>
        <div className="flex gap-3">
          <div className="h-16 w-16 rounded-lg bg-canvas" style={{ boxShadow: tokens.shadowSm }} />
          <div className="h-16 w-16 rounded-lg bg-canvas" style={{ boxShadow: tokens.shadowMd }} />
          <div className="h-16 w-16 rounded-lg bg-canvas" style={{ boxShadow: tokens.shadowLg }} />
          <div className="h-16 w-16 rounded-lg bg-canvas" style={{ boxShadow: tokens.shadowPrimary }} />
          <div className="h-16 w-16 rounded-lg bg-canvas" style={{ boxShadow: tokens.shadowAccent }} />
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */

type Tab = 'customizer' | 'preview' | 'components' | 'css';

export function DesignSystemClient() {
  const [activeTab, setActiveTab] = useState<Tab>('customizer');
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitStartX = useRef(0);
  const splitStartPos = useRef(0);

  const handleSplitStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);
    splitStartX.current = e.clientX;
    splitStartPos.current = splitPos;
  }, [splitPos]);

  useEffect(() => {
    if (!isDraggingSplit) return;
    const onMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const dx = e.clientX - splitStartX.current;
      const newPct = splitStartPos.current + (dx / containerWidth) * 100;
      setSplitPos(Math.max(25, Math.min(75, newPct)));
    };
    const onUp = () => setIsDraggingSplit(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingSplit]);

  const tabs = [
    { id: 'customizer' as const, label: 'Personalizar', icon: Palette },
    { id: 'preview' as const, label: 'Vista previa', icon: Monitor },
    { id: 'components' as const, label: 'Componentes', icon: Layout },
    { id: 'css' as const, label: 'CSS', icon: Code2 },
  ];

  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* Header */}
      <div className="flex h-[38px] shrink-0 items-center gap-3 border-b border-border-subtle bg-panel px-4">
        <Palette className="h-4 w-4 text-primary" />
        <span className="font-display text-sm font-bold text-white">Sistema de Diseño</span>
        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">Live</span>
        <div className="ml-auto flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors duration-150 ${
                activeTab === tab.id ? 'bg-primary/20 text-primary' : 'text-neutral-500 hover:bg-panel-hover hover:text-neutral-300'
              }`}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {activeTab === 'customizer' && (
          <>
            {/* Left: Customizer */}
            <div className="flex flex-col border-r border-border-subtle" style={{ width: `${splitPos}%` }}>
              <ThemeCustomizer />
            </div>
            {/* Drag handle */}
            <div
              className="w-1 shrink-0 cursor-col-resize hover:bg-primary/30 transition-colors"
              onMouseDown={handleSplitStart}
            />
            {/* Right: Live preview */}
            <div className="flex-1 overflow-hidden">
              <ResponsivePreview />
            </div>
          </>
        )}
        {activeTab === 'preview' && <ResponsivePreview />}
        {activeTab === 'components' && <ComponentShowcase />}
        {activeTab === 'css' && <CssEditor />}
      </div>
    </div>
  );
}
