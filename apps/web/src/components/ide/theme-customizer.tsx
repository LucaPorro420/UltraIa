'use client';

/**
 * ThemeCustomizer — panel de personalización visual completa.
 * Permite seleccionar presets, ajustar colores individuales, fuentes,
 * espaciado, radios, bordes, sombras, gradientes, animaciones,
 * z-index, scrollbar, opacidad, y exportar/importar temas.
 * Persiste todo en localStorage.
 */

import { useState } from 'react';
import {
  Palette,
  Type,
  Maximize2,
  Sliders,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  Copy,
  Check,
  Layers,
  Zap,
  Box,
  ArrowDownToLine,
  Eye,
  Code2,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from './theme-provider';
import {
  THEME_PRESETS,
  THEME_PRESET_LIST,
  TOKEN_CATEGORIES,
  TOKEN_LABELS,
  TOKEN_INPUT_TYPES,
  TOKEN_RANGE_CONFIG,
  generateCssVariables,
  type ThemeTokens,
  type ThemePresetId,
} from './theme-engine';

/* ── Input genérico por tipo ──────────────────────────────────────────── */

function TokenInput({
  tokenKey,
  value,
  onChange,
}: {
  tokenKey: keyof ThemeTokens;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputType = TOKEN_INPUT_TYPES[tokenKey] ?? 'text';
  const rangeConfig = TOKEN_RANGE_CONFIG[tokenKey];

  if (inputType === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-border-subtle bg-transparent"
          style={{ padding: 0 }}
        />
        <span className="text-xs text-neutral-400">{TOKEN_LABELS[tokenKey]}</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ml-auto w-20 rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] text-neutral-300 focus:border-border-active focus:outline-none"
        />
      </div>
    );
  }

  if (inputType === 'range' && rangeConfig) {
    const numVal = parseFloat(value) || rangeConfig.min;
    return (
      <div className="flex items-center gap-2">
        <span className="w-32 text-xs text-neutral-400">{TOKEN_LABELS[tokenKey]}</span>
        <input
          type="range"
          min={rangeConfig.min}
          max={rangeConfig.max}
          step={rangeConfig.step}
          value={numVal}
          onChange={(e) => onChange(`${e.target.value}${rangeConfig.unit}`)}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
        />
        <span className="w-14 text-right font-mono text-[10px] text-neutral-500">{value}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-32 text-xs text-neutral-400">{TOKEN_LABELS[tokenKey]}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-border-subtle bg-input-active px-2 py-1 text-xs font-mono text-neutral-200 focus:border-border-active focus:outline-none"
      />
    </div>
  );
}

/* ── Sección colapsable ───────────────────────────────────────────────── */

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen,
  count,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-border-subtle">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-panel-hover/60 transition-colors duration-150"
      >
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span>{title}</span>
        {count !== undefined && (
          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-mono text-primary">
            {count}
          </span>
        )}
        <span className="ml-auto text-neutral-600">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </span>
      </button>
      {open && <div className="space-y-2 px-3 pb-3">{children}</div>}
    </div>
  );
}

/* ── Preset Card ──────────────────────────────────────────────────────── */

function PresetCard({
  preset,
  active,
  onSelect,
}: {
  preset: (typeof THEME_PRESET_LIST)[number];
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full rounded-lg border p-3 text-left transition-all duration-150 ${
        active
          ? 'border-border-active bg-panel-hover/80 shadow-[0_0_12px_-4px_var(--color-primary)]'
          : 'border-border-subtle bg-panel hover:border-neutral-600 hover:bg-panel-hover/40'
      }`}
    >
      {/* Preview strip */}
      <div className="mb-2 flex h-6 overflow-hidden rounded">
        <div className="w-1/4" style={{ background: preset.tokens.canvas }} />
        <div className="w-1/4" style={{ background: preset.tokens.panel }} />
        <div className="w-1/4" style={{ background: preset.tokens.primary }} />
        <div className="w-1/4" style={{ background: preset.tokens.accent }} />
      </div>
      <p className="text-xs font-medium text-neutral-200">{preset.name}</p>
      <p className="mt-0.5 text-[10px] text-neutral-500">{preset.description}</p>
      {active && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-2.5 w-2.5" />
        </span>
      )}
    </button>
  );
}

/* ── Panel principal ──────────────────────────────────────────────────── */

type CustomizerTab = 'presets' | 'colors' | 'fonts' | 'layout' | 'effects' | 'shadows' | 'gradients' | 'animations' | 'advanced';

export function ThemeCustomizer() {
  const {
    config,
    tokens,
    setPreset,
    setCustomToken,
    resetToPreset,
    resetAll,
    exportCss,
    exportConfig,
    importConfig,
  } = useTheme();

  const [copied, setCopied] = useState<'config' | 'css' | null>(null);
  const [activeTab, setActiveTab] = useState<CustomizerTab>('presets');

  const tabs: { id: CustomizerTab; label: string; icon: React.ElementType }[] = [
    { id: 'presets', label: 'Temas', icon: Palette },
    { id: 'colors', label: 'Colores', icon: Palette },
    { id: 'fonts', label: 'Tipos', icon: Type },
    { id: 'layout', label: 'Layout', icon: Maximize2 },
    { id: 'effects', label: 'Efectos', icon: Sparkles },
    { id: 'shadows', label: 'Sombras', icon: Box },
    { id: 'gradients', label: 'Gradientes', icon: ArrowDownToLine },
    { id: 'animations', label: 'Motion', icon: Zap },
    { id: 'advanced', label: 'Avanzado', icon: Code2 },
  ];

  const handleExportConfig = () => {
    const data = exportConfig();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultraia-theme-${config.presetId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCss = () => {
    const css = exportCss();
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultraia-theme-${config.presetId}.css`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        importConfig(reader.result as string);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(exportConfig());
      setCopied('config');
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  };

  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(exportCss());
      setCopied('css');
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  };

  /* Subconjuntos de tokens por tab */
  const colorKeys = TOKEN_CATEGORIES;
  const fontKeys: (keyof ThemeTokens)[] = ['fontFamilySans', 'fontFamilyDisplay', 'fontFamilyMono', 'fontSizeBase', 'lineHeightBase', 'letterSpacingBase', 'spacingBase'];
  const layoutKeys = {
    'Densidad IDE': TOKEN_CATEGORIES['Densidad IDE'],
    'Radios': TOKEN_CATEGORIES['Radios'],
    'Grosor de Borde': TOKEN_CATEGORIES['Grosor de Borde'],
    'Scrollbar': TOKEN_CATEGORIES['Scrollbar'],
  };
  const effectKeys: (keyof ThemeTokens)[] = ['glowIntensity', 'borderOpacity', 'glassBlur', 'opacityDisabled', 'opacityMuted', 'opacityHover', ...TOKEN_CATEGORIES['Opacidad']];
  const shadowKeys = {
    'Sombras': TOKEN_CATEGORIES['Sombras'],
    'Sombras de Color': TOKEN_CATEGORIES['Sombras de Color'],
  };
  const gradientKeys: (keyof ThemeTokens)[] = TOKEN_CATEGORIES['Gradientes'];
  const animationKeys: (keyof ThemeTokens)[] = TOKEN_CATEGORIES['Animaciones'];
  const advancedKeys = {
    'Z-Index': TOKEN_CATEGORIES['Z-Index'],
    'Modalidad': TOKEN_CATEGORIES['Modalidad'],
    'Neo Violet': TOKEN_CATEGORIES['Neo Violet'],
  };

  return (
    <div className="flex h-full flex-col bg-panel">
      {/* Header */}
      <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-border-subtle px-3">
        <Palette className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
          Personalizar Diseño
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={handleExportConfig} title="Exportar JSON" className="rounded p-1 text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            <Download className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleExportCss} title="Exportar CSS" className="rounded p-1 text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={handleImport} title="Importar tema" className="rounded p-1 text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={copyConfig} title="Copiar config JSON" className="rounded p-1 text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            {copied === 'config' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={copyCss} title="Copiar CSS" className="rounded p-1 text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            {copied === 'css' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Code2 className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={resetToPreset} title="Restablecer preset" className="rounded p-1 text-neutral-500 hover:bg-panel-hover hover:text-neutral-300 transition-colors">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── PRESETS TAB ── */}
        {activeTab === 'presets' && (
          <div className="p-3">
            <p className="mb-3 text-xs text-neutral-500">
              Selecciona un tema base. Los cambios se aplican inmediatamente.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {THEME_PRESET_LIST.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  active={config.presetId === preset.id}
                  onSelect={() => setPreset(preset.id as ThemePresetId)}
                />
              ))}
            </div>
            {/* Live preview */}
            <div className="mt-4 rounded-lg border border-border-subtle bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
                Vista previa en vivo
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-xs text-foreground">Texto primario</span>
                  <span className="text-xs text-muted">Texto muted</span>
                </div>
                <div className="flex gap-1">
                  {(['agentVideo', 'agentAudio', 'agentText', 'agentCode', 'agentWeb'] as const).map(
                    (k) => (
                      <span key={k} className="h-4 w-4 rounded" style={{ background: tokens[k] }} title={TOKEN_LABELS[k]} />
                    ),
                  )}
                </div>
                <div className="flex gap-1">
                  {(['statusThinking', 'statusStreaming', 'statusError', 'statusSuccess', 'statusWarning'] as const).map(
                    (k) => (
                      <span key={k} className="h-2 w-2 rounded-full" style={{ background: tokens[k] }} title={TOKEN_LABELS[k]} />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── COLORS TAB ── */}
        {activeTab === 'colors' && (
          <div className="p-3">
            {Object.entries(colorKeys).map(([catName, catKeys]) => (
              <CollapsibleSection
                key={catName}
                title={catName}
                icon={Palette}
                defaultOpen={catName === 'Superficies' || catName === 'Acentos'}
                count={catKeys.length}
              >
                {catKeys.map((key) => (
                  <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
                ))}
              </CollapsibleSection>
            ))}
          </div>
        )}

        {/* ── FONTS TAB ── */}
        {activeTab === 'fonts' && (
          <div className="p-3">
            <CollapsibleSection title="Fuentes" icon={Type} defaultOpen>
              {fontKeys.map((key) => (
                <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
              ))}
            </CollapsibleSection>
            {/* Font preview */}
            <div className="mt-3 rounded-lg border border-border-subtle bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Vista previa</p>
              <div className="space-y-2">
                <p style={{ fontFamily: tokens.fontFamilyDisplay, color: tokens.foreground, fontSize: '24px', fontWeight: 700 }}>
                  Display Heading
                </p>
                <p style={{ fontFamily: tokens.fontFamilySans, color: tokens.foreground, fontSize: tokens.fontSizeBase, lineHeight: tokens.lineHeightBase }}>
                  Body text — Inter for functional UI. The quick brown fox jumps over the lazy dog.
                </p>
                <p style={{ fontFamily: tokens.fontFamilyMono, color: tokens.muted, fontSize: '12px' }}>
                  JetBrains Mono — const cmd = &quot;ultraia create agent&quot;;
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── LAYOUT TAB ── */}
        {activeTab === 'layout' && (
          <div className="p-3">
            {Object.entries(layoutKeys).map(([catName, catKeys]) => (
              <CollapsibleSection key={catName} title={catName} icon={Maximize2} defaultOpen count={catKeys.length}>
                {catKeys.map((key) => (
                  <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
                ))}
              </CollapsibleSection>
            ))}
          </div>
        )}

        {/* ── EFFECTS TAB ── */}
        {activeTab === 'effects' && (
          <div className="p-3">
            <CollapsibleSection title="Efectos visuales" icon={Sparkles} defaultOpen count={effectKeys.length}>
              {effectKeys.map((key) => (
                <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
              ))}
            </CollapsibleSection>
            {/* Vista previa de efectos */}
            <div className="mt-3 rounded-lg border border-border-subtle bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Vista previa de efectos</p>
              <div className="space-y-2">
                <div
                  className="rounded-lg p-3 text-xs text-neutral-200"
                  style={{
                    background: `color-mix(in srgb, ${tokens.panel} 82%, transparent)`,
                    backdropFilter: `blur(${tokens.glassBlur})`,
                    border: `${tokens.borderWidthSm} solid ${tokens.borderSubtle}`,
                    boxShadow: tokens.shadowMd,
                  }}
                >
                  Panel glass con shadow
                </div>
                <div className="flex gap-2">
                  {(['agentVideo', 'agentAudio', 'agentText', 'agentCode', 'agentWeb'] as const).map(
                    (k) => (
                      <div
                        key={k}
                        className="h-8 w-8 rounded-lg"
                        style={{
                          border: `${tokens.borderWidthMd} solid ${tokens[k]}`,
                          boxShadow: `0 0 ${parseInt(tokens.glowIntensity) * 20}px -4px ${tokens[k]}`,
                        }}
                        title={TOKEN_LABELS[k]}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SHADOWS TAB ── */}
        {activeTab === 'shadows' && (
          <div className="p-3">
            {Object.entries(shadowKeys).map(([catName, catKeys]) => (
              <CollapsibleSection key={catName} title={catName} icon={Box} defaultOpen count={catKeys.length}>
                {catKeys.map((key) => (
                  <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
                ))}
              </CollapsibleSection>
            ))}
            {/* Shadow preview */}
            <div className="mt-3 rounded-lg border border-border-subtle bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Vista previa de sombras</p>
              <div className="flex gap-4">
                <div className="h-16 w-16 rounded-lg bg-panel" style={{ boxShadow: tokens.shadowSm }} />
                <div className="h-16 w-16 rounded-lg bg-panel" style={{ boxShadow: tokens.shadowMd }} />
                <div className="h-16 w-16 rounded-lg bg-panel" style={{ boxShadow: tokens.shadowLg }} />
              </div>
              <div className="mt-3 flex gap-4">
                <div className="h-16 w-16 rounded-lg bg-panel" style={{ boxShadow: tokens.shadowPrimary }} />
                <div className="h-16 w-16 rounded-lg bg-panel" style={{ boxShadow: tokens.shadowAccent }} />
                <div className="h-16 w-16 rounded-lg bg-panel" style={{ boxShadow: tokens.shadowDestructive }} />
              </div>
            </div>
          </div>
        )}

        {/* ── GRADIENTS TAB ── */}
        {activeTab === 'gradients' && (
          <div className="p-3">
            <CollapsibleSection title="Gradientes" icon={ArrowDownToLine} defaultOpen count={gradientKeys.length}>
              {gradientKeys.map((key) => (
                <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
              ))}
            </CollapsibleSection>
            {/* Gradient preview */}
            <div className="mt-3 rounded-lg border border-border-subtle bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Vista previa de gradientes</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded-lg" style={{ background: tokens.gradientPrimary }} />
                <div className="h-12 rounded-lg" style={{ background: tokens.gradientAccent }} />
                <div className="h-12 rounded-lg" style={{ background: tokens.gradientAgent }} />
                <div className="h-12 rounded-lg" style={{ background: tokens.gradientPanel }} />
              </div>
            </div>
          </div>
        )}

        {/* ── ANIMATIONS TAB ── */}
        {activeTab === 'animations' && (
          <div className="p-3">
            <CollapsibleSection title="Motion" icon={Zap} defaultOpen count={animationKeys.length}>
              {animationKeys.map((key) => (
                <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
              ))}
            </CollapsibleSection>
            {/* Animation preview */}
            <div className="mt-3 rounded-lg border border-border-subtle bg-canvas p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Vista previa de motion</p>
              <div className="space-y-2">
                <div
                  className="h-8 w-8 rounded-full bg-primary"
                  style={{
                    animation: `pulse ${2 / parseFloat(tokens.animationSpeed)}s ${tokens.easingDefault} infinite`,
                  }}
                />
                <div className="flex gap-2">
                  <div
                    className="h-4 rounded bg-accent transition-all"
                    style={{ transitionDuration: tokens.transitionDuration, width: '60px' }}
                  />
                  <div
                    className="h-4 rounded bg-primary transition-all"
                    style={{ transitionDuration: tokens.transitionDuration, width: '120px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADVANCED TAB ── */}
        {activeTab === 'advanced' && (
          <div className="p-3">
            {Object.entries(advancedKeys).map(([catName, catKeys]) => (
              <CollapsibleSection key={catName} title={catName} icon={Layers} defaultOpen={catName === 'Z-Index'} count={catKeys.length}>
                {catKeys.map((key) => (
                  <TokenInput key={key} tokenKey={key} value={tokens[key]} onChange={(v) => setCustomToken(key, v)} />
                ))}
              </CollapsibleSection>
            ))}
            {/* CSS Variables editor */}
            <CollapsibleSection title="Variables CSS personalizadas" icon={Code2}>
              <div className="rounded border border-border-subtle bg-canvas p-2">
                <pre className="max-h-48 overflow-auto font-mono text-[10px] text-neutral-400 whitespace-pre-wrap">
                  {generateCssVariables(tokens).slice(0, 2000)}
                </pre>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2">
        <span className="font-mono text-[10px] text-neutral-600">
          {Object.keys(TOKEN_LABELS).length} tokens · Tema: {config.presetId === 'custom' ? 'Custom' : THEME_PRESETS[config.presetId]?.name ?? config.presetId}
        </span>
        <button
          type="button"
          onClick={resetAll}
          className="rounded px-2 py-1 text-[10px] text-neutral-500 hover:bg-panel-hover hover:text-destructive transition-colors"
        >
          Restablecer todo
        </button>
      </div>
    </div>
  );
}
