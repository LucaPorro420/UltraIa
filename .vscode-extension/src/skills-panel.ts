//! Skills Panel - Browse and invoke 58+ capabilities with live status.

import * as vscode from 'vscode';
import { UltraIaAgent } from './agent';
import { baseCss, escHtml } from './webview-utils';

// Capability data from the project
const CAPABILITIES = [
  { name: 'sdf', description: 'SDF + Ray Marching', tools: ['sdf_render'], file: 'packages/core/src/tools/sdf.ts' },
  { name: 'videoqa', description: 'Video Quality Analysis', tools: ['videoqa_metrics'], file: 'packages/core/src/tools/videoqa.ts' },
  { name: 'motion', description: 'Motion Analysis', tools: ['motion_analyze'], file: 'packages/core/src/tools/motion.ts' },
  { name: 'replica', description: 'Replica Engine', tools: ['replica_run'], file: 'packages/core/src/tools/replica.ts' },
  { name: 'travel', description: 'Travel Video Planning', tools: ['travel_plan'], file: 'packages/core/src/tools/travel.ts' },
  { name: 'codevfx', description: 'Code VFX', tools: ['vfx_code'], file: 'packages/core/src/tools/codevfx.ts' },
  { name: 'geometry', description: 'Geometry (Gielis)', tools: ['geometry_build'], file: 'packages/core/src/tools/geometry.ts' },
  { name: 'pngrender', description: 'PNG Renderer', tools: ['png_render'], file: 'packages/core/src/tools/pngrender.ts' },
  { name: 'procvid', description: 'Procedural Video', tools: ['procvid_render'], file: 'packages/core/src/tools/procvid.ts' },
  { name: 'diagram', description: 'SVG Diagrams', tools: ['diagram_render'], file: 'packages/core/src/tools/diagram.ts' },
  { name: 'harness', description: 'Plugin Harness', tools: ['harness_manage'], file: 'packages/core/src/tools/harness.ts' },
  { name: 'growth', description: 'Growth Analytics', tools: ['growth_plan'], file: 'packages/core/src/tools/growth.ts' },
  { name: 'cloud', description: 'Cloud Storage', tools: ['cloud_files'], file: 'packages/core/src/tools/cloud.ts' },
  { name: 'publish', description: 'Multi-platform Publishing', tools: ['publish_submit'], file: 'packages/core/src/tools/publish.ts' },
  { name: 'publications', description: 'Publication Queue', tools: ['publication_queue'], file: 'packages/core/src/tools/publications.ts' },
  { name: 'topics', description: 'Content Topics', tools: ['topics_briefs', 'topics_queue'], file: 'packages/core/src/tools/topics.ts' },
  { name: 'present', description: 'Publication Packages', tools: ['present_package'], file: 'packages/core/src/tools/present.ts' },
  { name: 'metrics', description: 'Publication Metrics', tools: ['publication_metrics'], file: 'packages/core/src/tools/metrics.ts' },
  { name: 'telegram', description: 'Telegram Bot Adapter', tools: ['createTelegramAdapter'], file: 'packages/core/src/tools/telegram.ts' },
  { name: 'discord', description: 'Discord Webhook', tools: ['createDiscordAdapter'], file: 'packages/core/src/tools/discord.ts' },
  { name: 'slack', description: 'Slack Bot', tools: ['createSlackAdapter'], file: 'packages/core/src/tools/slack.ts' },
  { name: 'g0dm0d3', description: 'G0DM0D3 (parseltongue)', tools: ['g0_parseltongue', 'g0_autotune'], file: 'packages/core/src/tools/g0dm0d3.ts' },
  { name: 'screenflow', description: 'Screen Recording', tools: ['screenflow_plan'], file: 'packages/core/src/tools/screenflow.ts' },
  { name: 'videoEdit', description: 'Video Editing', tools: ['video_edit_pack', 'video_edit_edl'], file: 'packages/core/src/tools/video-edit.ts' },
  { name: 'chaos_game', description: 'Chaos Game Fractal', tools: ['chaos_game'], file: 'packages/core/src/tools/chaos-game.ts' },
  { name: 'reach', description: 'Web Search', tools: ['reach_searchWeb', 'reach_readWeb'], file: 'packages/core/src/tools/reach.ts' },
  { name: 'skills', description: 'Agent Skills', tools: ['skill_plan', 'skill_build'], file: 'packages/core/src/tools/skills.ts' },
  { name: 'memory', description: 'Memory System', tools: ['memory_store', 'memory_query'], file: 'packages/core/src/tools/memory.ts' },
  { name: 'vault', description: 'Vault (artifacts)', tools: ['vault_manage'], file: 'packages/core/src/tools/vault.ts' },
  { name: 'pdfsearch', description: 'PDF Search', tools: ['pdfsearch_search'], file: 'packages/core/src/tools/pdfsearch.ts' },
  { name: 'autolearn', description: 'Auto-Learning', tools: ['autolearn_run'], file: 'packages/core/src/tools/autolearn.ts' },
  { name: 'kgraph', description: 'Knowledge Graph', tools: ['kgraph_query'], file: 'packages/core/src/tools/kgraph.ts' },
];

export class SkillsPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia.skills';
  private view?: vscode.WebviewView;
  private agent: UltraIaAgent;

  constructor(agent: UltraIaAgent) {
    this.agent = agent;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'openFile':
          const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
          const uri = vscode.Uri.file(require('path').join(rootPath, message.file));
          vscode.window.showTextDocument(uri);
          break;
        case 'chatWithSkill':
          vscode.commands.executeCommand('ultraia.openChat');
          setTimeout(() => {
            vscode.commands.executeCommand('ultraia.chat');
          }, 200);
          break;
      }
    });
  }

  private postMessage(msg: any): void {
    this.view?.webview.postMessage(msg);
  }

  private getHtml(): string {
    const tools = this.agent.getToolRegistry().getSchema();
    const toolNames = new Set(tools.map(t => t.name));

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
.list { flex: 1; overflow-y: auto; }
.cap-item {
  padding: 8px; border: 1px solid var(--border); border-radius: 6px;
  margin-bottom: 6px; cursor: pointer;
}
.cap-item:hover { border-color: var(--primary); }
.cap-header { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.cap-name { font-size: 13px; font-weight: 600; color: var(--text); }
.cap-badge { padding: 1px 4px; border-radius: 3px; font-size: 10px; background: rgba(139,92,246,0.15); color: var(--primary); }
.cap-badge.builtin { background: rgba(34,197,94,0.15); color: var(--success); }
.cap-desc { font-size: 12px; color: var(--text-dim); }
.cap-tools { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
.cap-tool {
  padding: 1px 4px; border-radius: 3px; font-size: 10px;
  background: var(--tool-bg); color: var(--text-dim); font-family: monospace;
}
.cap-tool.has { color: var(--success); }
.cap-file { font-size: 10px; color: var(--text-dim); margin-top: 4px; }
.count { font-size: 11px; color: var(--text-dim); margin-bottom: 8px; }
</style>
</head>
<body>
  <div class="container">
    <div class="toolbar">
      <input type="text" id="search" placeholder="Search capabilities and tools..." />
    </div>
    <div class="count" id="count"></div>
    <div class="list" id="list"></div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const list = document.getElementById('list');
    const count = document.getElementById('count');
    const search = document.getElementById('search');
    const caps = ${JSON.stringify(CAPABILITIES)};
    const activeTools = new Set(${JSON.stringify([...toolNames])});

    function render(filter) {
      const q = (filter || '').toLowerCase();
      const filtered = caps.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tools.some(t => t.toLowerCase().includes(q))
      );
      count.textContent = filtered.length + ' of ' + caps.length + ' capabilities';
      list.innerHTML = '';
      for (const c of filtered) {
        const div = document.createElement('div');
        div.className = 'cap-item';
        const toolCount = c.tools.filter(t => activeTools.has(t)).length;
        div.innerHTML =
          '<div class="cap-header">' +
            '<span class="cap-name">' + c.name + '</span>' +
            '<span class="cap-badge">' + c.tools.length + ' tools</span>' +
            (toolCount > 0 ? '<span class="cap-badge builtin">' + toolCount + ' active</span>' : '') +
          '</div>' +
          '<div class="cap-desc">' + c.description + '</div>' +
          '<div class="cap-tools">' + c.tools.map(t => '<span class="cap-tool' + (activeTools.has(t) ? ' has' : '') + '">' + t + '</span>').join('') + '</div>' +
          '<div class="cap-file">' + c.file + '</div>';
        div.addEventListener('click', () => {
          vscode.postMessage({ type: 'openFile', file: c.file });
        });
        list.appendChild(div);
      }
    }

    search.addEventListener('input', () => render(search.value));
    render('');
  </script>
</body>
</html>`;
  }
}
