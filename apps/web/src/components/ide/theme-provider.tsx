'use client';

/**
 * ThemeProvider — provee el tema activo a toda la app IDE.
 * Aplica tokens CSS al :root, persiste en localStorage, y expone
 * la API para cambiar temas en tiempo real.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  type ThemeConfig,
  type ThemeTokens,
  type ThemePresetId,
  resolveThemeTokens,
  applyThemeTokens,
  saveThemeConfig,
  loadThemeConfig,
  generateCssVariables,
} from './theme-engine';

interface ThemeContextValue {
  config: ThemeConfig;
  tokens: ThemeTokens;
  setPreset: (id: ThemePresetId) => void;
  setCustomToken: (key: keyof ThemeTokens, value: string) => void;
  setCustomTokens: (patch: Partial<ThemeTokens>) => void;
  resetToPreset: () => void;
  resetAll: () => void;
  /** Genera CSS completo con todas las variables para copiar. */
  exportCss: () => string;
  /** Importa un ThemeConfig desde JSON string. */
  importConfig: (json: string) => boolean;
  /** Exporta config como JSON string. */
  exportConfig: () => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(() => loadThemeConfig());

  // Aplica tokens al montar y cuando cambian
  useEffect(() => {
    const tokens = resolveThemeTokens(config);
    applyThemeTokens(tokens);
    saveThemeConfig(config);
  }, [config]);

  const setPreset = useCallback((id: ThemePresetId) => {
    setConfig({ presetId: id, customTokens: undefined });
  }, []);

  const setCustomToken = useCallback((key: keyof ThemeTokens, value: string) => {
    setConfig((prev) => ({
      presetId: 'custom',
      customTokens: {
        ...resolveThemeTokens(prev),
        ...prev.customTokens,
        [key]: value,
      },
    }));
  }, []);

  const setCustomTokens = useCallback((patch: Partial<ThemeTokens>) => {
    setConfig((prev) => ({
      presetId: 'custom',
      customTokens: {
        ...resolveThemeTokens(prev),
        ...prev.customTokens,
        ...patch,
      },
    }));
  }, []);

  const resetToPreset = useCallback(() => {
    setConfig((prev) => ({
      presetId: prev.presetId === 'custom' ? 'dark-obsidian' : prev.presetId,
      customTokens: undefined,
    }));
  }, []);

  const resetAll = useCallback(() => {
    setConfig({ presetId: 'dark-obsidian' });
  }, []);

  const exportCss = useCallback(() => {
    return generateCssVariables(resolveThemeTokens(config));
  }, [config]);

  const importConfig = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (data && typeof data.presetId === 'string') {
        setConfig(data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const exportConfig = useCallback(() => {
    return JSON.stringify(config, null, 2);
  }, [config]);

  const tokens = useMemo(() => resolveThemeTokens(config), [config]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      config,
      tokens,
      setPreset,
      setCustomToken,
      setCustomTokens,
      resetToPreset,
      resetAll,
      exportCss,
      importConfig,
      exportConfig,
    }),
    [config, tokens, setPreset, setCustomToken, setCustomTokens, resetToPreset, resetAll, exportCss, importConfig, exportConfig],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
