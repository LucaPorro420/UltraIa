//! Shared webview utilities for UltraIa panels.
// Common CSS, HTML helpers, and theme tokens.

export const THEME = {
  bg: '#08080a',
  panel: '#111115',
  border: '#1f1f2a',
  primary: '#8b5cf6',
  primaryDim: '#7c3aed',
  text: '#e4e4e7',
  textDim: '#a1a1aa',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  toolBg: '#1a1a2e',
  toolBorder: '#27272a',
};

export function baseCss(): string {
  return `
  :root {
    --bg: ${THEME.bg};
    --panel: ${THEME.panel};
    --border: ${THEME.border};
    --primary: ${THEME.primary};
    --primary-dim: ${THEME.primaryDim};
    --text: ${THEME.text};
    --text-dim: ${THEME.textDim};
    --success: ${THEME.success};
    --error: ${THEME.error};
    --warning: ${THEME.warning};
    --tool-bg: ${THEME.toolBg};
    --tool-border: ${THEME.toolBorder};
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
    background: var(--bg);
    color: var(--text);
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: 13px;
  }
  a { color: var(--primary); text-decoration: none; }
  a:hover { text-decoration: underline; }
  button { cursor: pointer; font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #333; }
  `;
}

export function panelHeader(title: string, subtitle?: string): string {
  return `
  <div style="padding:8px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0;">
    <div style="width:6px;height:6px;border-radius:50%;background:var(--success);flex-shrink:0;"></div>
    <div style="font-size:13px;font-weight:600;color:var(--primary);">${escHtml(title)}</div>
    ${subtitle ? `<div style="font-size:11px;color:var(--text-dim);margin-left:auto;">${escHtml(subtitle)}</div>` : ''}
  </div>`;
}

export function escHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function postMessageScript(): string {
  return `
  <script>
    const vscode = acquireVsCodeApi();
    function post(msg) { vscode.postMessage(msg); }
  </script>`;
}
