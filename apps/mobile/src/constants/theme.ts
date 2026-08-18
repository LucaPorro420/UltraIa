/**
 * Dark Obsidian — tokens del design system de UltraIa (port de globals.css del web).
 * Canvas #08080a · Panel #111115 · Primary #8b5cf6 · Border-subtle #1f1f2a.
 * Acentos de modalidad inmutables: video/audio/text/code/web.
 */
export const Colors = {
  light: {
    text: '#0b0b0e',
    background: '#ffffff',
    backgroundElement: '#f3f3f6',
    backgroundSelected: '#e7e7ee',
    textSecondary: '#5a5a66',
    border: '#e2e2ea',
    primary: '#8b5cf6',
    primarySoft: '#ede9fe',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  dark: {
    text: '#f4f4f6',
    background: '#08080a',
    backgroundElement: '#111115',
    backgroundSelected: '#1a1a21',
    textSecondary: '#9a9aa8',
    border: '#1f1f2a',
    primary: '#8b5cf6',
    primarySoft: '#2a2340',
    danger: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Acentos por modalidad (inmutables, del design system web). */
export const ModalAccents = {
  video: '#ef4444',
  audio: '#22c55e',
  text: '#3b82f6',
  code: '#eab308',
  web: '#8b5cf6',
} as const;

export const Fonts = {
  sans: 'system-ui',
  mono: 'ui-monospace',
} as const;
