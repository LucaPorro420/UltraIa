/**
 * UltraIa Theme Engine — sistema de temas personalizables estilo VSCode.
 *
 * Cada tema define tokens CSS que se aplican al `:root` via inline styles.
 * Los usuarios pueden seleccionar presets, crear temas custom, y ajustar
 * colores, fuentes, espaciado, radios, bordes, animaciones, sombras,
 * gradientes, z-index, scrollbar, y densidad en tiempo real.
 *
 * Persistencia: localStorage key `ultraia-theme`.
 */

/* ── Tipos ────────────────────────────────────────────────────────────── */

export interface ThemeTokens {
  /* Superficies */
  canvas: string;
  panel: string;
  panelHeader: string;
  panelHover: string;
  inputActive: string;

  /* Bordes */
  borderSubtle: string;
  borderMuted: string;
  borderActive: string;

  /* Acentos */
  primary: string;
  accent: string;
  destructive: string;

  /* Texto */
  foreground: string;
  muted: string;

  /* Modalidad de agente */
  agentVideo: string;
  agentAudio: string;
  agentText: string;
  agentCode: string;
  agentWeb: string;

  /* Estados */
  statusThinking: string;
  statusStreaming: string;
  statusError: string;
  statusSuccess: string;
  statusWarning: string;
  statusPending: string;
  statusFail: string;

  /* Neo Violet */
  neo100: string;
  neo200: string;
  neo300: string;
  neo400: string;
  neo500: string;
  neo600: string;
  neo700: string;

  /* Tipografía */
  fontFamilySans: string;
  fontFamilyDisplay: string;
  fontFamilyMono: string;
  fontSizeBase: string;
  lineHeightBase: string;
  letterSpacingBase: string;

  /* Espaciado */
  spacingBase: string;

  /* Densidad IDE */
  ideHeaderHeight: string;
  ideActivitybarWidth: string;
  ideSidebarWidth: string;
  idePanelGap: string;

  /* Radios */
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;

  /* Bordes */
  borderWidthSm: string;
  borderWidthMd: string;
  borderWidthLg: string;

  /* Efectos */
  glowIntensity: string;
  borderOpacity: string;
  glassBlur: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;

  /* Sombras de color */
  shadowPrimary: string;
  shadowAccent: string;
  shadowDestructive: string;

  /* Gradientes */
  gradientPrimary: string;
  gradientAccent: string;
  gradientAgent: string;
  gradientPanel: string;

  /* Animaciones */
  animationSpeed: string;
  transitionDuration: string;
  easingDefault: string;
  easingBounce: string;

  /* Z-Index */
  zIndexDropdown: string;
  zIndexSticky: string;
  zIndexOverlay: string;
  zIndexModal: string;
  zIndexToast: string;

  /* Scrollbar */
  scrollbarWidth: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;

  /* Cursor */
  cursorDefault: string;
  cursorPointer: string;

  /* Opacidad */
  opacityDisabled: string;
  opacityMuted: string;
  opacityHover: string;
}

export type ThemePresetId =
  | 'dark-obsidian'
  | 'neo-violet'
  | 'midnight-blue'
  | 'emerald-dark'
  | 'amber-dark'
  | 'cyber-punk'
  | 'arctic-light'
  | 'solarized-dark'
  | 'dracula'
  | 'monokai';

export interface ThemePreset {
  id: ThemePresetId | 'custom';
  name: string;
  description: string;
  tokens: ThemeTokens;
}

export interface ThemeConfig {
  presetId: ThemePresetId | 'custom';
  customTokens?: Partial<ThemeTokens>;
}

/* ── Presets ──────────────────────────────────────────────────────────── */

const DARK_OBSIDIAN: ThemeTokens = {
  /* Superficies */
  canvas: '#08080a',
  panel: '#111115',
  panelHeader: '#18181f',
  panelHover: '#22222c',
  inputActive: '#0d0d11',
  /* Bordes */
  borderSubtle: '#1f1f2a',
  borderMuted: '#2e2e3d',
  borderActive: '#6366f1',
  /* Acentos */
  primary: '#8b5cf6',
  accent: '#f472b6',
  destructive: '#f87171',
  /* Texto */
  foreground: '#e4e4e7',
  muted: '#71717a',
  /* Modalidad */
  agentVideo: '#a855f7',
  agentAudio: '#06b6d4',
  agentText: '#f59e0b',
  agentCode: '#10b981',
  agentWeb: '#6366f1',
  /* Estados */
  statusThinking: '#3b82f6',
  statusStreaming: '#10b981',
  statusError: '#ef4444',
  statusSuccess: '#4ade80',
  statusWarning: '#fbbf24',
  statusPending: '#fbbf24',
  statusFail: '#f87171',
  /* Neo Violet */
  neo100: '#f69dee',
  neo200: '#ee9ced',
  neo300: '#d09ae6',
  neo400: '#988cdb',
  neo500: '#7578d3',
  neo600: '#5167cb',
  neo700: '#1854a1',
  /* Tipografía */
  fontFamilySans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontFamilyDisplay: 'Plus Jakarta Sans, Inter, ui-sans-serif, sans-serif',
  fontFamilyMono: 'JetBrains Mono, ui-monospace, monospace',
  fontSizeBase: '14px',
  lineHeightBase: '1.5',
  letterSpacingBase: '0em',
  /* Espaciado */
  spacingBase: '4px',
  /* Densidad IDE */
  ideHeaderHeight: '38px',
  ideActivitybarWidth: '52px',
  ideSidebarWidth: '280px',
  idePanelGap: '4px',
  /* Radios */
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '12px',
  radiusXl: '16px',
  /* Bordes */
  borderWidthSm: '1px',
  borderWidthMd: '2px',
  borderWidthLg: '3px',
  /* Efectos */
  glowIntensity: '0.35',
  borderOpacity: '1',
  glassBlur: '12px',
  shadowSm: '0 1px 2px rgba(0,0,0,0.3)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.4)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.5)',
  /* Sombras de color */
  shadowPrimary: '0 0 20px -4px #8b5cf6',
  shadowAccent: '0 0 20px -4px #f472b6',
  shadowDestructive: '0 0 20px -4px #f87171',
  /* Gradientes */
  gradientPrimary: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
  gradientAccent: 'linear-gradient(135deg, #f472b6, #ec4899)',
  gradientAgent: 'linear-gradient(135deg, #a855f7, #06b6d4)',
  gradientPanel: 'linear-gradient(180deg, #111115, #08080a)',
  /* Animaciones */
  animationSpeed: '1',
  transitionDuration: '150ms',
  easingDefault: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /* Z-Index */
  zIndexDropdown: '1000',
  zIndexSticky: '1020',
  zIndexOverlay: '1040',
  zIndexModal: '1060',
  zIndexToast: '1080',
  /* Scrollbar */
  scrollbarWidth: '6px',
  scrollbarTrack: '#111115',
  scrollbarThumb: '#2e2e3d',
  scrollbarThumbHover: '#44446a',
  /* Cursor */
  cursorDefault: 'default',
  cursorPointer: 'pointer',
  /* Opacidad */
  opacityDisabled: '0.4',
  opacityMuted: '0.6',
  opacityHover: '0.85',
};

const NEO_VIOLET: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#0a0812',
  panel: '#120e1e',
  panelHeader: '#1a1428',
  panelHover: '#241c38',
  borderActive: '#988cdb',
  primary: '#d09ae6',
  accent: '#ee9ced',
  neo400: '#b8a8e8',
  glowIntensity: '0.45',
  gradientPrimary: 'linear-gradient(135deg, #d09ae6, #988cdb)',
  gradientAccent: 'linear-gradient(135deg, #ee9ced, #d09ae6)',
  shadowPrimary: '0 0 20px -4px #d09ae6',
  shadowAccent: '0 0 20px -4px #ee9ced',
};

const MIDNIGHT_BLUE: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#0a0e1a',
  panel: '#0f1424',
  panelHeader: '#141a2e',
  panelHover: '#1c2440',
  borderActive: '#3b82f6',
  primary: '#3b82f6',
  accent: '#60a5fa',
  agentWeb: '#3b82f6',
  statusThinking: '#60a5fa',
  neo100: '#93c5fd',
  neo200: '#60a5fa',
  neo300: '#3b82f6',
  neo400: '#2563eb',
  neo500: '#1d4ed8',
  neo600: '#1e40af',
  neo700: '#1e3a8a',
  gradientPrimary: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  gradientAccent: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
  shadowPrimary: '0 0 20px -4px #3b82f6',
  shadowAccent: '0 0 20px -4px #60a5fa',
  gradientPanel: 'linear-gradient(180deg, #0f1424, #0a0e1a)',
};

const EMERALD_DARK: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#080a08',
  panel: '#0e120e',
  panelHeader: '#141a14',
  panelHover: '#1c281c',
  borderActive: '#10b981',
  primary: '#10b981',
  accent: '#34d399',
  agentCode: '#10b981',
  neo100: '#a7f3d0',
  neo200: '#6ee7b7',
  neo300: '#34d399',
  neo400: '#10b981',
  neo500: '#059669',
  neo600: '#047857',
  neo700: '#065f46',
  gradientPrimary: 'linear-gradient(135deg, #10b981, #059669)',
  gradientAccent: 'linear-gradient(135deg, #34d399, #10b981)',
  shadowPrimary: '0 0 20px -4px #10b981',
  shadowAccent: '0 0 20px -4px #34d399',
  gradientPanel: 'linear-gradient(180deg, #0e120e, #080a08)',
};

const AMBER_DARK: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#0a0908',
  panel: '#14120e',
  panelHeader: '#1a160e',
  panelHover: '#28200c',
  borderActive: '#f59e0b',
  primary: '#f59e0b',
  accent: '#fbbf24',
  agentText: '#f59e0b',
  neo100: '#fde68a',
  neo200: '#fcd34d',
  neo300: '#fbbf24',
  neo400: '#f59e0b',
  neo500: '#d97706',
  neo600: '#b45309',
  neo700: '#92400e',
  gradientPrimary: 'linear-gradient(135deg, #f59e0b, #d97706)',
  gradientAccent: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  shadowPrimary: '0 0 20px -4px #f59e0b',
  shadowAccent: '0 0 20px -4px #fbbf24',
  gradientPanel: 'linear-gradient(180deg, #14120e, #0a0908)',
};

const CYBER_PUNK: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#0a0014',
  panel: '#14001e',
  panelHeader: '#1e0028',
  panelHover: '#2c0038',
  borderActive: '#ff00ff',
  primary: '#ff00ff',
  accent: '#00ffff',
  agentVideo: '#ff00ff',
  agentAudio: '#00ffff',
  agentText: '#ffff00',
  agentCode: '#00ff88',
  agentWeb: '#ff6600',
  statusThinking: '#00ffff',
  statusStreaming: '#00ff88',
  statusError: '#ff0000',
  statusSuccess: '#00ff88',
  statusWarning: '#ffff00',
  statusPending: '#ffff00',
  statusFail: '#ff0000',
  neo100: '#ff88ff',
  neo200: '#ff44ff',
  neo300: '#ff00ff',
  neo400: '#cc00cc',
  neo500: '#aa00aa',
  neo600: '#880088',
  neo700: '#660066',
  glowIntensity: '0.6',
  shadowPrimary: '0 0 30px -4px #ff00ff',
  shadowAccent: '0 0 30px -4px #00ffff',
  gradientPrimary: 'linear-gradient(135deg, #ff00ff, #cc00cc)',
  gradientAccent: 'linear-gradient(135deg, #00ffff, #0088ff)',
  gradientAgent: 'linear-gradient(135deg, #ff00ff, #00ffff)',
  gradientPanel: 'linear-gradient(180deg, #14001e, #0a0014)',
  animationSpeed: '0.8',
  transitionDuration: '100ms',
};

const ARCTIC_LIGHT: ThemeTokens = {
  canvas: '#f8f9fc',
  panel: '#ffffff',
  panelHeader: '#f1f3f8',
  panelHover: '#e8ebf0',
  inputActive: '#f8f9fc',
  borderSubtle: '#d1d5db',
  borderMuted: '#9ca3af',
  borderActive: '#6366f1',
  primary: '#6366f1',
  accent: '#ec4899',
  destructive: '#ef4444',
  foreground: '#111827',
  muted: '#6b7280',
  agentVideo: '#8b5cf6',
  agentAudio: '#0891b2',
  agentText: '#d97706',
  agentCode: '#059669',
  agentWeb: '#4f46e5',
  statusThinking: '#3b82f6',
  statusStreaming: '#10b981',
  statusError: '#ef4444',
  statusSuccess: '#4ade80',
  statusWarning: '#fbbf24',
  statusPending: '#fbbf24',
  statusFail: '#f87171',
  neo100: '#f69dee',
  neo200: '#ee9ced',
  neo300: '#d09ae6',
  neo400: '#988cdb',
  neo500: '#7578d3',
  neo600: '#5167cb',
  neo700: '#1854a1',
  fontFamilySans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontFamilyDisplay: 'Plus Jakarta Sans, Inter, ui-sans-serif, sans-serif',
  fontFamilyMono: 'JetBrains Mono, ui-monospace, monospace',
  fontSizeBase: '14px',
  lineHeightBase: '1.5',
  letterSpacingBase: '0em',
  spacingBase: '4px',
  ideHeaderHeight: '38px',
  ideActivitybarWidth: '52px',
  ideSidebarWidth: '280px',
  idePanelGap: '4px',
  radiusSm: '4px',
  radiusMd: '8px',
  radiusLg: '12px',
  radiusXl: '16px',
  borderWidthSm: '1px',
  borderWidthMd: '2px',
  borderWidthLg: '3px',
  glowIntensity: '0.15',
  borderOpacity: '1',
  glassBlur: '8px',
  shadowSm: '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 12px rgba(0,0,0,0.1)',
  shadowLg: '0 12px 40px rgba(0,0,0,0.12)',
  shadowPrimary: '0 0 16px -4px #6366f1',
  shadowAccent: '0 0 16px -4px #ec4899',
  shadowDestructive: '0 0 16px -4px #ef4444',
  gradientPrimary: 'linear-gradient(135deg, #6366f1, #4f46e5)',
  gradientAccent: 'linear-gradient(135deg, #ec4899, #db2777)',
  gradientAgent: 'linear-gradient(135deg, #8b5cf6, #0891b2)',
  gradientPanel: 'linear-gradient(180deg, #ffffff, #f8f9fc)',
  zIndexDropdown: '1000',
  zIndexSticky: '1020',
  zIndexOverlay: '1040',
  zIndexModal: '1060',
  zIndexToast: '1080',
  scrollbarWidth: '6px',
  scrollbarTrack: '#f1f3f8',
  scrollbarThumb: '#c1c5cc',
  scrollbarThumbHover: '#9ca3af',
  cursorDefault: 'default',
  cursorPointer: 'pointer',
  animationSpeed: '1',
  transitionDuration: '150ms',
  easingDefault: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easingBounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  opacityDisabled: '0.5',
  opacityMuted: '0.7',
  opacityHover: '0.9',
};

const SOLARIZED_DARK: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#002b36',
  panel: '#073642',
  panelHeader: '#0a3d4c',
  panelHover: '#0d4456',
  inputActive: '#00303c',
  borderSubtle: '#0d4456',
  borderMuted: '#1a5c6e',
  borderActive: '#268bd2',
  primary: '#268bd2',
  accent: '#b58900',
  foreground: '#93a1a1',
  muted: '#657b83',
  statusThinking: '#268bd2',
  statusStreaming: '#2aa198',
  statusError: '#dc322f',
  statusSuccess: '#859900',
  statusWarning: '#b58900',
  statusPending: '#b58900',
  statusFail: '#dc322f',
  neo100: '#fdf6e3',
  neo200: '#eee8d5',
  neo300: '#93a1a1',
  neo400: '#839496',
  neo500: '#657b83',
  neo600: '#586e75',
  neo700: '#073642',
  gradientPrimary: 'linear-gradient(135deg, #268bd2, #2aa198)',
  gradientAccent: 'linear-gradient(135deg, #b58900, #cb4b16)',
  shadowPrimary: '0 0 16px -4px #268bd2',
  shadowAccent: '0 0 16px -4px #b58900',
  gradientPanel: 'linear-gradient(180deg, #073642, #002b36)',
};

const DRACULA: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#282a36',
  panel: '#21222c',
  panelHeader: '#191a21',
  panelHover: '#343746',
  inputActive: '#1e1f29',
  borderSubtle: '#44475a',
  borderMuted: '#6272a4',
  borderActive: '#bd93f9',
  primary: '#bd93f9',
  accent: '#ff79c6',
  foreground: '#f8f8f2',
  muted: '#6272a4',
  agentVideo: '#bd93f9',
  agentAudio: '#8be9fd',
  agentText: '#f1fa8c',
  agentCode: '#50fa7b',
  agentWeb: '#ff79c6',
  statusThinking: '#6272a4',
  statusStreaming: '#50fa7b',
  statusError: '#ff5555',
  statusSuccess: '#50fa7b',
  statusWarning: '#f1fa8c',
  statusPending: '#f1fa8c',
  statusFail: '#ff5555',
  neo100: '#f8f8f2',
  neo200: '#f1fa8c',
  neo300: '#8be9fd',
  neo400: '#bd93f9',
  neo500: '#ff79c6',
  neo600: '#50fa7b',
  neo700: '#ff5555',
  gradientPrimary: 'linear-gradient(135deg, #bd93f9, #ff79c6)',
  gradientAccent: 'linear-gradient(135deg, #ff79c6, #ff5555)',
  shadowPrimary: '0 0 20px -4px #bd93f9',
  shadowAccent: '0 0 20px -4px #ff79c6',
  gradientPanel: 'linear-gradient(180deg, #21222c, #282a36)',
  scrollbarTrack: '#21222c',
  scrollbarThumb: '#44475a',
  scrollbarThumbHover: '#6272a4',
};

const MONOKAI: ThemeTokens = {
  ...DARK_OBSIDIAN,
  canvas: '#272822',
  panel: '#1e1f1a',
  panelHeader: '#2a2b24',
  panelHover: '#3a3b34',
  inputActive: '#1c1d17',
  borderSubtle: '#3e3d32',
  borderMuted: '#75715e',
  borderActive: '#a6e22e',
  primary: '#a6e22e',
  accent: '#f92672',
  foreground: '#f8f8f2',
  muted: '#75715e',
  agentVideo: '#ae81ff',
  agentAudio: '#66d9ef',
  agentText: '#e6db74',
  agentCode: '#a6e22e',
  agentWeb: '#f92672',
  statusThinking: '#66d9ef',
  statusStreaming: '#a6e22e',
  statusError: '#f92672',
  statusSuccess: '#a6e22e',
  statusWarning: '#e6db74',
  statusPending: '#e6db74',
  statusFail: '#f92672',
  neo100: '#f8f8f2',
  neo200: '#e6db74',
  neo300: '#66d9ef',
  neo400: '#a6e22e',
  neo500: '#f92672',
  neo600: '#ae81ff',
  neo700: '#75715e',
  gradientPrimary: 'linear-gradient(135deg, #a6e22e, #66d9ef)',
  gradientAccent: 'linear-gradient(135deg, #f92672, #ae81ff)',
  shadowPrimary: '0 0 20px -4px #a6e22e',
  shadowAccent: '0 0 20px -4px #f92672',
  gradientPanel: 'linear-gradient(180deg, #1e1f1a, #272822)',
  scrollbarTrack: '#1e1f1a',
  scrollbarThumb: '#3e3d32',
  scrollbarThumbHover: '#75715e',
};

/* ── Registry ─────────────────────────────────────────────────────────── */

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  'dark-obsidian': {
    id: 'dark-obsidian',
    name: 'Dark Obsidian',
    description: 'El tema canónico de UltraIa — oscuro, preciso, instrumental.',
    tokens: DARK_OBSIDIAN,
  },
  'neo-violet': {
    id: 'neo-violet',
    name: 'Neo Violet',
    description: 'Púrpura neón sobre fondo profundo — impacto visual premium.',
    tokens: NEO_VIOLET,
  },
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Azul medianoche — profesional, tranquilo, alto contraste.',
    tokens: MIDNIGHT_BLUE,
  },
  'emerald-dark': {
    id: 'emerald-dark',
    name: 'Emerald Dark',
    description: 'Esmeralda sobre negro — natural, refinado, código limpio.',
    tokens: EMERALD_DARK,
  },
  'amber-dark': {
    id: 'amber-dark',
    name: 'Amber Dark',
    description: 'Ámbar cálido — alertas visibles, tono acogedor.',
    tokens: AMBER_DARK,
  },
  'cyber-punk': {
    id: 'cyber-punk',
    name: 'Cyber Punk',
    description: 'Neón extremo — para quien busca máximo impacto.',
    tokens: CYBER_PUNK,
  },
  'arctic-light': {
    id: 'arctic-light',
    name: 'Arctic Light',
    description: 'Claro y limpio — el único tema light, para ambientes brillantes.',
    tokens: ARCTIC_LIGHT,
  },
  'solarized-dark': {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    description: 'Clásico Solarized — legendaria ergonomía cromática.',
    tokens: SOLARIZED_DARK,
  },
  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    description: 'Popular, alegre, bien contrastado.',
    tokens: DRACULA,
  },
  'monokai': {
    id: 'monokai',
    name: 'Monokai',
    description: 'El clásico de Sublime Text — vibrante y legible.',
    tokens: MONOKAI,
  },
};

export const THEME_PRESET_LIST = Object.values(THEME_PRESETS);

/* ── Aplicación ───────────────────────────────────────────────────────── */

const CSS_VAR_MAP: Record<keyof ThemeTokens, string> = {
  /* Superficies */
  canvas: '--color-canvas',
  panel: '--color-panel',
  panelHeader: '--color-panel-header',
  panelHover: '--color-panel-hover',
  inputActive: '--color-input-active',
  /* Bordes */
  borderSubtle: '--color-border-subtle',
  borderMuted: '--color-border-muted',
  borderActive: '--color-border-active',
  /* Acentos */
  primary: '--color-primary',
  accent: '--color-accent',
  destructive: '--color-destructive',
  /* Texto */
  foreground: '--color-foreground',
  muted: '--color-muted',
  /* Modalidad */
  agentVideo: '--agent-video',
  agentAudio: '--agent-audio',
  agentText: '--agent-text',
  agentCode: '--agent-code',
  agentWeb: '--agent-web',
  /* Estados */
  statusThinking: '--status-thinking',
  statusStreaming: '--status-streaming',
  statusError: '--status-error',
  statusSuccess: '--status-success',
  statusWarning: '--status-warning',
  statusPending: '--status-pending',
  statusFail: '--status-fail',
  /* Neo Violet */
  neo100: '--color-neo-100',
  neo200: '--color-neo-200',
  neo300: '--color-neo-300',
  neo400: '--color-neo-400',
  neo500: '--color-neo-500',
  neo600: '--color-neo-600',
  neo700: '--color-neo-700',
  /* Tipografía */
  fontFamilySans: '--font-sans',
  fontFamilyDisplay: '--font-display',
  fontFamilyMono: '--font-mono',
  fontSizeBase: '--font-size-base',
  lineHeightBase: '--line-height-base',
  letterSpacingBase: '--letter-spacing-base',
  /* Espaciado */
  spacingBase: '--spacing-base',
  /* Densidad IDE */
  ideHeaderHeight: '--ide-header-height',
  ideActivitybarWidth: '--ide-activitybar-width',
  ideSidebarWidth: '--ide-sidebar-width',
  idePanelGap: '--ide-panel-gap',
  /* Radios */
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  radiusXl: '--radius-xl',
  /* Bordes */
  borderWidthSm: '--border-width-sm',
  borderWidthMd: '--border-width-md',
  borderWidthLg: '--border-width-lg',
  /* Efectos */
  glowIntensity: '--glow-intensity',
  borderOpacity: '--border-opacity',
  glassBlur: '--glass-blur',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  /* Sombras de color */
  shadowPrimary: '--shadow-primary',
  shadowAccent: '--shadow-accent',
  shadowDestructive: '--shadow-destructive',
  /* Gradientes */
  gradientPrimary: '--gradient-primary',
  gradientAccent: '--gradient-accent',
  gradientAgent: '--gradient-agent',
  gradientPanel: '--gradient-panel',
  /* Animaciones */
  animationSpeed: '--animation-speed',
  transitionDuration: '--transition-duration',
  easingDefault: '--easing-default',
  easingBounce: '--easing-bounce',
  /* Z-Index */
  zIndexDropdown: '--z-dropdown',
  zIndexSticky: '--z-sticky',
  zIndexOverlay: '--z-overlay',
  zIndexModal: '--z-modal',
  zIndexToast: '--z-toast',
  /* Scrollbar */
  scrollbarWidth: '--scrollbar-width',
  scrollbarTrack: '--scrollbar-track',
  scrollbarThumb: '--scrollbar-thumb',
  scrollbarThumbHover: '--scrollbar-thumb-hover',
  /* Cursor */
  cursorDefault: '--cursor-default',
  cursorPointer: '--cursor-pointer',
  /* Opacidad */
  opacityDisabled: '--opacity-disabled',
  opacityMuted: '--opacity-muted',
  opacityHover: '--opacity-hover',
};

/** Aplica un set completo de tokens al :root como inline styles. */
export function applyThemeTokens(tokens: ThemeTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = tokens[key as keyof ThemeTokens];
    if (value !== undefined) {
      root.style.setProperty(cssVar, value);
    }
  }
}

/** Resuelve un ThemeConfig (preset + overrides) a tokens finales. */
export function resolveThemeTokens(config: ThemeConfig): ThemeTokens {
  const base = config.presetId === 'custom'
    ? DARK_OBSIDIAN
    : THEME_PRESETS[config.presetId]?.tokens ?? DARK_OBSIDIAN;
  return { ...base, ...config.customTokens };
}

/** Guarda la configuración en localStorage. */
export function saveThemeConfig(config: ThemeConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('ultraia-theme', JSON.stringify(config));
}

/** Carga la configuración desde localStorage. */
export function loadThemeConfig(): ThemeConfig {
  if (typeof window === 'undefined') {
    return { presetId: 'dark-obsidian' };
  }
  try {
    const raw = window.localStorage.getItem('ultraia-theme');
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupto → fallback */
  }
  return { presetId: 'dark-obsidian' };
}

/** Obtiene el token CSS variable name desde un ThemeTokens key. */
export function getCssVarName(tokenKey: keyof ThemeTokens): string {
  return CSS_VAR_MAP[tokenKey];
}

/** Genera CSS completo con todas las variables para copiar/pegar. */
export function generateCssVariables(tokens: ThemeTokens): string {
  const lines = [':root {'];
  for (const [key, cssVar] of Object.entries(CSS_VAR_MAP)) {
    const value = tokens[key as keyof ThemeTokens];
    if (value !== undefined) {
      lines.push(`  ${cssVar}: ${value};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}

/** Lista de keys editables agrupadas por categoría. */
export const TOKEN_CATEGORIES = {
  'Superficies': ['canvas', 'panel', 'panelHeader', 'panelHover', 'inputActive'] as (keyof ThemeTokens)[],
  'Bordes': ['borderSubtle', 'borderMuted', 'borderActive'] as (keyof ThemeTokens)[],
  'Acentos': ['primary', 'accent', 'destructive'] as (keyof ThemeTokens)[],
  'Texto': ['foreground', 'muted'] as (keyof ThemeTokens)[],
  'Modalidad': ['agentVideo', 'agentAudio', 'agentText', 'agentCode', 'agentWeb'] as (keyof ThemeTokens)[],
  'Estados': ['statusThinking', 'statusStreaming', 'statusError', 'statusSuccess', 'statusWarning', 'statusPending', 'statusFail'] as (keyof ThemeTokens)[],
  'Neo Violet': ['neo100', 'neo200', 'neo300', 'neo400', 'neo500', 'neo600', 'neo700'] as (keyof ThemeTokens)[],
  'Tipografía': ['fontFamilySans', 'fontFamilyDisplay', 'fontFamilyMono', 'fontSizeBase', 'lineHeightBase', 'letterSpacingBase'] as (keyof ThemeTokens)[],
  'Espaciado': ['spacingBase'] as (keyof ThemeTokens)[],
  'Densidad IDE': ['ideHeaderHeight', 'ideActivitybarWidth', 'ideSidebarWidth', 'idePanelGap'] as (keyof ThemeTokens)[],
  'Radios': ['radiusSm', 'radiusMd', 'radiusLg', 'radiusXl'] as (keyof ThemeTokens)[],
  'Grosor de Borde': ['borderWidthSm', 'borderWidthMd', 'borderWidthLg'] as (keyof ThemeTokens)[],
  'Efectos': ['glowIntensity', 'borderOpacity', 'glassBlur'] as (keyof ThemeTokens)[],
  'Sombras': ['shadowSm', 'shadowMd', 'shadowLg'] as (keyof ThemeTokens)[],
  'Sombras de Color': ['shadowPrimary', 'shadowAccent', 'shadowDestructive'] as (keyof ThemeTokens)[],
  'Gradientes': ['gradientPrimary', 'gradientAccent', 'gradientAgent', 'gradientPanel'] as (keyof ThemeTokens)[],
  'Animaciones': ['animationSpeed', 'transitionDuration', 'easingDefault', 'easingBounce'] as (keyof ThemeTokens)[],
  'Z-Index': ['zIndexDropdown', 'zIndexSticky', 'zIndexOverlay', 'zIndexModal', 'zIndexToast'] as (keyof ThemeTokens)[],
  'Scrollbar': ['scrollbarWidth', 'scrollbarTrack', 'scrollbarThumb', 'scrollbarThumbHover'] as (keyof ThemeTokens)[],
  'Opacidad': ['opacityDisabled', 'opacityMuted', 'opacityHover'] as (keyof ThemeTokens)[],
};

/** Labels legibles para cada token. */
export const TOKEN_LABELS: Record<keyof ThemeTokens, string> = {
  /* Superficies */
  canvas: 'Fondo general',
  panel: 'Panel primario',
  panelHeader: 'Cabecera de panel',
  panelHover: 'Hover de panel',
  inputActive: 'Input activo',
  /* Bordes */
  borderSubtle: 'Borde sutil',
  borderMuted: 'Borde muted',
  borderActive: 'Borde de foco',
  /* Acentos */
  primary: 'Primario',
  accent: 'Acento',
  destructive: 'Destructivo',
  /* Texto */
  foreground: 'Texto principal',
  muted: 'Texto secundario',
  /* Modalidad */
  agentVideo: 'Agente video',
  agentAudio: 'Agente audio',
  agentText: 'Agente texto',
  agentCode: 'Agente código',
  agentWeb: 'Agente web',
  /* Estados */
  statusThinking: 'Estado thinking',
  statusStreaming: 'Estado streaming',
  statusError: 'Estado error',
  statusSuccess: 'Estado éxito',
  statusWarning: 'Estado advertencia',
  statusPending: 'Estado pendiente',
  statusFail: 'Estado fallo',
  /* Neo Violet */
  neo100: 'Neo 100',
  neo200: 'Neo 200',
  neo300: 'Neo 300',
  neo400: 'Neo 400',
  neo500: 'Neo 500',
  neo600: 'Neo 600',
  neo700: 'Neo 700',
  /* Tipografía */
  fontFamilySans: 'Fuente body',
  fontFamilyDisplay: 'Fuente display',
  fontFamilyMono: 'Fuente mono',
  fontSizeBase: 'Tamaño base',
  lineHeightBase: 'Line height',
  letterSpacingBase: 'Letter spacing',
  /* Espaciado */
  spacingBase: 'Espaciado base',
  /* Densidad IDE */
  ideHeaderHeight: 'Altura header IDE',
  ideActivitybarWidth: 'Ancho activity bar',
  ideSidebarWidth: 'Ancho sidebar',
  idePanelGap: 'Gap paneles',
  /* Radios */
  radiusSm: 'Radio pequeño',
  radiusMd: 'Radio medio',
  radiusLg: 'Radio grande',
  radiusXl: 'Radio extra grande',
  /* Bordes */
  borderWidthSm: 'Borde fino',
  borderWidthMd: 'Borde medio',
  borderWidthLg: 'Borde grueso',
  /* Efectos */
  glowIntensity: 'Intensidad glow',
  borderOpacity: 'Opacidad bordes',
  glassBlur: 'Blur glass',
  /* Sombras */
  shadowSm: 'Sombra pequeña',
  shadowMd: 'Sombra mediana',
  shadowLg: 'Sombra grande',
  /* Sombras de color */
  shadowPrimary: 'Sombra primario',
  shadowAccent: 'Sombra acento',
  shadowDestructive: 'Sombra destructivo',
  /* Gradientes */
  gradientPrimary: 'Gradiente primario',
  gradientAccent: 'Gradiente acento',
  gradientAgent: 'Gradiente agente',
  gradientPanel: 'Gradiente panel',
  /* Animaciones */
  animationSpeed: 'Velocidad animaciones',
  transitionDuration: 'Duración transiciones',
  easingDefault: 'Easing default',
  easingBounce: 'Easing bounce',
  /* Z-Index */
  zIndexDropdown: 'Z-index dropdown',
  zIndexSticky: 'Z-index sticky',
  zIndexOverlay: 'Z-index overlay',
  zIndexModal: 'Z-index modal',
  zIndexToast: 'Z-index toast',
  /* Scrollbar */
  scrollbarWidth: 'Ancho scrollbar',
  scrollbarTrack: 'Track scrollbar',
  scrollbarThumb: 'Thumb scrollbar',
  scrollbarThumbHover: 'Thumb hover scrollbar',
  /* Cursor */
  cursorDefault: 'Cursor default',
  cursorPointer: 'Cursor pointer',
  /* Opacidad */
  opacityDisabled: 'Opacidad disabled',
  opacityMuted: 'Opacidad muted',
  opacityHover: 'Opacidad hover',
};

/** Clasificación de tokens por tipo de input. */
export const TOKEN_INPUT_TYPES: Record<string, 'color' | 'range' | 'text' | 'select'> = {
  /* Color inputs */
  canvas: 'color', panel: 'color', panelHeader: 'color', panelHover: 'color', inputActive: 'color',
  borderSubtle: 'color', borderMuted: 'color', borderActive: 'color',
  primary: 'color', accent: 'color', destructive: 'color',
  foreground: 'color', muted: 'color',
  agentVideo: 'color', agentAudio: 'color', agentText: 'color', agentCode: 'color', agentWeb: 'color',
  statusThinking: 'color', statusStreaming: 'color', statusError: 'color', statusSuccess: 'color',
  statusWarning: 'color', statusPending: 'color', statusFail: 'color',
  neo100: 'color', neo200: 'color', neo300: 'color', neo400: 'color', neo500: 'color', neo600: 'color', neo700: 'color',
  scrollbarTrack: 'color', scrollbarThumb: 'color', scrollbarThumbHover: 'color',
  shadowPrimary: 'color', shadowAccent: 'color', shadowDestructive: 'color',
  /* Range inputs */
  fontSizeBase: 'range', lineHeightBase: 'range', letterSpacingBase: 'range', spacingBase: 'range',
  ideHeaderHeight: 'range', ideActivitybarWidth: 'range', ideSidebarWidth: 'range', idePanelGap: 'range',
  radiusSm: 'range', radiusMd: 'range', radiusLg: 'range', radiusXl: 'range',
  borderWidthSm: 'range', borderWidthMd: 'range', borderWidthLg: 'range',
  glowIntensity: 'range', borderOpacity: 'range', glassBlur: 'range',
  animationSpeed: 'range', transitionDuration: 'range',
  zIndexDropdown: 'range', zIndexSticky: 'range', zIndexOverlay: 'range', zIndexModal: 'range', zIndexToast: 'range',
  scrollbarWidth: 'range', opacityDisabled: 'range', opacityMuted: 'range', opacityHover: 'range',
  /* Text inputs */
  fontFamilySans: 'text', fontFamilyDisplay: 'text', fontFamilyMono: 'text',
  easingDefault: 'text', easingBounce: 'text',
  shadowSm: 'text', shadowMd: 'text', shadowLg: 'text',
  gradientPrimary: 'text', gradientAccent: 'text', gradientAgent: 'text', gradientPanel: 'text',
  cursorDefault: 'text', cursorPointer: 'text',
};

/** Configuración de range para cada token numérico. */
export const TOKEN_RANGE_CONFIG: Record<string, { min: number; max: number; step: number; unit: string }> = {
  fontSizeBase: { min: 10, max: 24, step: 1, unit: 'px' },
  lineHeightBase: { min: 1, max: 2.5, step: 0.1, unit: '' },
  letterSpacingBase: { min: -0.05, max: 0.2, step: 0.01, unit: 'em' },
  spacingBase: { min: 2, max: 12, step: 1, unit: 'px' },
  ideHeaderHeight: { min: 28, max: 56, step: 2, unit: 'px' },
  ideActivitybarWidth: { min: 36, max: 72, step: 2, unit: 'px' },
  ideSidebarWidth: { min: 180, max: 480, step: 10, unit: 'px' },
  idePanelGap: { min: 0, max: 12, step: 1, unit: 'px' },
  radiusSm: { min: 0, max: 12, step: 1, unit: 'px' },
  radiusMd: { min: 0, max: 20, step: 1, unit: 'px' },
  radiusLg: { min: 0, max: 28, step: 1, unit: 'px' },
  radiusXl: { min: 0, max: 40, step: 1, unit: 'px' },
  borderWidthSm: { min: 0, max: 4, step: 1, unit: 'px' },
  borderWidthMd: { min: 0, max: 6, step: 1, unit: 'px' },
  borderWidthLg: { min: 0, max: 8, step: 1, unit: 'px' },
  glowIntensity: { min: 0, max: 1, step: 0.05, unit: '' },
  borderOpacity: { min: 0, max: 1, step: 0.05, unit: '' },
  glassBlur: { min: 0, max: 40, step: 1, unit: 'px' },
  animationSpeed: { min: 0.2, max: 3, step: 0.1, unit: '' },
  transitionDuration: { min: 50, max: 500, step: 25, unit: 'ms' },
  zIndexDropdown: { min: 100, max: 9999, step: 10, unit: '' },
  zIndexSticky: { min: 100, max: 9999, step: 10, unit: '' },
  zIndexOverlay: { min: 100, max: 9999, step: 10, unit: '' },
  zIndexModal: { min: 100, max: 9999, step: 10, unit: '' },
  zIndexToast: { min: 100, max: 9999, step: 10, unit: '' },
  scrollbarWidth: { min: 2, max: 16, step: 1, unit: 'px' },
  opacityDisabled: { min: 0, max: 1, step: 0.05, unit: '' },
  opacityMuted: { min: 0, max: 1, step: 0.05, unit: '' },
  opacityHover: { min: 0, max: 1, step: 0.05, unit: '' },
};
