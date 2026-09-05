//! Memory Panel - Cognitive memory viewer and manager.

import * as vscode from 'vscode';
import { UltraIaAgent, MemoryEntry } from './agent';
import { baseCss, escHtml } from './webview-utils';

export class MemoryPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia.memory';
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
          this.refresh(message.layer);
          break;
        case 'delete':
          this.agent.deleteMemory(message.id);
          this.refresh(message.layer);
          break;
        case 'store':
          await this.storeMemory(message);
          this.refresh(message.layer);
          break;
      }
    });
  }

  private refresh(layer?: string): void {
    const memories = this.agent.getMemories(layer);
    this.postMessage({ type: 'memories', memories, layer });
  }

  private async storeMemory(message: any): Promise<void> {
    const content = await vscode.window.showInputBox({
      prompt: 'Memory content',
      placeHolder: 'What do you want to remember?',
    });
    if (!content) return;
    const layer = await vscode.window.showQuickPick(
      ['working', 'episodic', 'semantic', 'metacognitive'],
      { placeHolder: 'Memory layer' }
    );
    const tags = await vscode.window.showInputBox({
      prompt: 'Tags (comma-separated)',
      placeHolder: 'e.g. bug, fix, auth',
    });
    // Store via the agent's tool
    const tool = this.agent.getToolRegistry().get('memory_store');
    if (tool) {
      await tool.execute({ content, layer: layer || 'working', tags: tags || '' });
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
.toolbar { display: flex; gap: 4px; margin-bottom: 8px; flex-shrink: 0; flex-wrap: wrap; }
.layer-btn {
  padding: 4px 8px; background: var(--tool-bg); border: 1px solid var(--tool-border);
  border-radius: 4px; color: var(--text-dim); font-size: 11px; cursor: pointer;
}
.layer-btn:hover, .layer-btn.active { border-color: var(--primary); color: var(--primary); }
.add-btn {
  margin-left: auto; padding: 4px 8px; background: var(--primary); border: none;
  border-radius: 4px; color: white; font-size: 11px; cursor: pointer;
}
.add-btn:hover { background: var(--primary-dim); }
.list { flex: 1; overflow-y: auto; }
.mem-item {
  padding: 8px; border: 1px solid var(--border); border-radius: 6px;
  margin-bottom: 6px; position: relative;
}
.mem-header { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.mem-layer {
  padding: 1px 4px; border-radius: 3px; font-size: 10px;
  background: var(--tool-bg); color: var(--primary);
}
.mem-id { font-size: 10px; color: var(--text-dim); }
.mem-date { font-size: 10px; color: var(--text-dim); margin-left: auto; }
.mem-content { font-size: 12px; color: var(--text); line-height: 1.4; }
.mem-tags { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
.mem-tag {
  padding: 1px 4px; border-radius: 3px; font-size: 10px;
  background: var(--tool-bg); color: var(--text-dim);
}
.mem-delete {
  position: absolute; top: 8px; right: 8px; background: transparent;
  border: none; color: var(--text-dim); cursor: pointer; font-size: 11px; opacity: 0;
}
.mem-item:hover .mem-delete { opacity: 1; }
.mem-delete:hover { color: var(--error); }
.empty { text-align: center; color: var(--text-dim); padding: 40px 0; font-size: 12px; }
.stats { padding: 6px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-dim); flex-shrink: 0; display: flex; gap: 12px; }
</style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <button class="layer-btn active" data-layer="">All</button>
      <button class="layer-btn" data-layer="working">Working</button>
      <button class="layer-btn" data-layer="episodic">Episodic</button>
      <button class="layer-btn" data-layer="semantic">Semantic</button>
      <button class="layer-btn" data-layer="metacognitive">Metacognitive</button>
      <button class="add-btn" onclick="post({type:'store'})">+ Store</button>
    </div>
    <div class="list" id="list"><div class="empty">Loading...</div></div>
    <div class="stats" id="stats"></div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const list = document.getElementById('list');
    const stats = document.getElementById('stats');
    let currentLayer = '';
    function post(msg) { vscode.postMessage(msg); }

    document.querySelectorAll('.layer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLayer = btn.dataset.layer;
        post({ type: 'load', layer: currentLayer });
      });
    });

    function render(memories) {
      if (memories.length === 0) {
        list.innerHTML = '<div class="empty">No memories stored yet.<br>Use the agent to store memories, or click + Store.</div>';
        stats.textContent = '';
        return;
      }
      list.innerHTML = '';
      const counts = {};
      for (const m of memories) { counts[m.layer] = (counts[m.layer] || 0) + 1; }
      stats.textContent = Object.entries(counts).map(([k, v]) => k + ': ' + v).join(' | ');
      for (const m of memories) {
        const div = document.createElement('div');
        div.className = 'mem-item';
        const date = new Date(m.createdAt).toLocaleString();
        div.innerHTML =
          '<div class="mem-header">' +
            '<span class="mem-layer">' + m.layer + '</span>' +
            '<span class="mem-id">' + m.id + '</span>' +
            '<span class="mem-date">' + date + '</span>' +
          '</div>' +
          '<div class="mem-content">' + escapeHtml(m.content) + '</div>' +
          (m.tags.length ? '<div class="mem-tags">' + m.tags.map(t => '<span class="mem-tag">' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
          '<button class="mem-delete" data-id="' + m.id + '" data-layer="' + currentLayer + '">Delete</button>';
        div.querySelector('.mem-delete').addEventListener('click', e => {
          post({ type: 'delete', id: e.target.dataset.id, layer: currentLayer });
        });
        list.appendChild(div);
      }
    }

    function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

    window.addEventListener('message', event => {
      if (event.data.type === 'memories') render(event.data.memories);
    });

    post({ type: 'load', layer: '' });
  </script>
</body>
</html>`;
  }
}
