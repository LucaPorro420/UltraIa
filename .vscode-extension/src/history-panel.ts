//! History Panel - Browsable conversation history with search.

import * as vscode from 'vscode';
import { UltraIaAgent, ChatSession } from './agent';
import { baseCss, escHtml } from './webview-utils';

export class HistoryPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia.history';
  private view?: vscode.WebviewView;
  private agent: UltraIaAgent;

  constructor(agent: UltraIaAgent) {
    this.agent = agent;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'load':
          this.refresh();
          break;
        case 'switchSession':
          this.agent.switchSession(message.sessionId);
          vscode.commands.executeCommand('ultraia.openChat');
          break;
        case 'exportAll':
          await this.exportAll();
          break;
        case 'deleteSession':
          this.agent.deleteSession(message.sessionId);
          this.refresh();
          break;
      }
    });
  }

  private refresh(): void {
    this.postMessage({
      type: 'sessions',
      sessions: this.agent.getSessions().map(s => ({
        id: s.id,
        title: s.title,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        model: s.model,
        preview: s.messages.filter(m => m.role === 'user').slice(-1)[0]?.content.substring(0, 120) || '',
      })),
    });
  }

  private async exportAll(): Promise<void> {
    const sessions = this.agent.getSessions();
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('.ultraia/chat-history.json'),
      filters: { JSON: ['json'] },
    });
    if (uri) {
      require('fs').writeFileSync(uri.fsPath, JSON.stringify(sessions, null, 2));
      vscode.window.showInformationMessage(`History exported to ${uri.fsPath}`);
    }
  }

  private postMessage(msg: any): void {
    this.view?.webview.postMessage(msg);
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${baseCss()}
.container { padding: 8px; height: 100vh; display: flex; flex-direction: column; }
.toolbar { display: flex; gap: 4px; margin-bottom: 8px; flex-shrink: 0; }
.toolbar input {
  flex: 1; padding: 6px 8px; background: var(--panel); border: 1px solid var(--border);
  border-radius: 4px; color: var(--text); font-size: 12px; outline: none;
}
.toolbar input:focus { border-color: var(--primary); }
.toolbar input::placeholder { color: var(--text-dim); }
.toolbar button {
  padding: 4px 8px; background: var(--tool-bg); border: 1px solid var(--tool-border);
  border-radius: 4px; color: var(--text-dim); font-size: 11px; cursor: pointer;
}
.toolbar button:hover { border-color: var(--primary); color: var(--primary); }
.list { flex: 1; overflow-y: auto; }
.history-item {
  padding: 8px; border: 1px solid var(--border); border-radius: 6px;
  margin-bottom: 6px; cursor: pointer; transition: border-color 0.15s;
}
.history-item:hover { border-color: var(--primary); }
.history-title { font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 2px; }
.history-meta { font-size: 11px; color: var(--text-dim); display: flex; gap: 8px; }
.history-preview { font-size: 11px; color: var(--text-dim); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { padding: 1px 4px; border-radius: 3px; font-size: 10px; background: var(--tool-bg); color: var(--text-dim); }
.empty { text-align: center; color: var(--text-dim); padding: 40px 0; font-size: 12px; }
</style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <input type="text" id="search" placeholder="Search conversations..." />
      <button onclick="exportAll()">Export</button>
      <button onclick="post({type:'load'})">Refresh</button>
    </div>
    <div class="list" id="list"><div class="empty">Loading...</div></div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const list = document.getElementById('list');
    const search = document.getElementById('search');
    let allSessions = [];
    function post(msg) { vscode.postMessage(msg); }

    function render(sessions) {
      allSessions = sessions;
      filterAndRender();
    }

    function filterAndRender() {
      const q = search.value.toLowerCase();
      const filtered = allSessions.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.preview.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q)
      );
      if (filtered.length === 0) {
        list.innerHTML = '<div class="empty">No conversations found</div>';
        return;
      }
      list.innerHTML = '';
      for (const s of filtered) {
        const div = document.createElement('div');
        div.className = 'history-item';
        const date = new Date(s.createdAt).toLocaleDateString();
        const time = new Date(s.lastActivityAt).toLocaleTimeString();
        div.innerHTML =
          '<div class="history-title">' + escapeHtml(s.title) + '</div>' +
          '<div class="history-meta">' +
            '<span class="badge">' + escapeHtml(s.model) + '</span>' +
            '<span>' + s.messageCount + ' msgs</span>' +
            '<span>' + date + ' ' + time + '</span>' +
          '</div>' +
          (s.preview ? '<div class="history-preview">' + escapeHtml(s.preview) + '</div>' : '');
        div.addEventListener('click', () => post({ type: 'switchSession', sessionId: s.id }));
        list.appendChild(div);
      }
    }

    function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function exportAll() { post({ type: 'exportAll' }); }
    search.addEventListener('input', filterAndRender);

    window.addEventListener('message', event => {
      if (event.data.type === 'sessions') render(event.data.sessions);
    });

    post({ type: 'load' });
  </script>
</body>
</html>`;
  }
}
