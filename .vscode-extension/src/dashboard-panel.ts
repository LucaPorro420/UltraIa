//! Dashboard Panel - Dynamic project dashboard.

import * as vscode from 'vscode';
import { baseCss, escHtml } from './webview-utils';
import * as path from 'path';
import * as fs from 'fs';

export class DashboardPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia.dashboard';
  private view?: vscode.WebviewView;
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'load':
          this.refresh();
          break;
        case 'openWeb':
          vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000'));
          break;
        case 'startDev':
          vscode.commands.executeCommand('ultraia.startDev');
          break;
        case 'runAll':
          vscode.commands.executeCommand('ultraia.runAllGates');
          break;
        case 'openState':
          vscode.commands.executeCommand('ultraia.openDashboard');
          break;
      }
    });
  }

  private refresh(): void {
    const stats = this.getProjectStats();
    this.postMessage({ type: 'stats', ...stats });
  }

  private getProjectStats() {
    const pkgPath = path.join(this.rootPath, 'package.json');
    let pkg: any = {};
    try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')); } catch { /* */ }

    const coreToolsDir = path.join(this.rootPath, 'packages', 'core', 'src', 'tools');
    let toolCount = 0;
    try {
      const files = fs.readdirSync(coreToolsDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
      toolCount = files.length;
    } catch { /* */ }

    const statePath = path.join(this.rootPath, 'STATE.md');
    let tasksDone = 0;
    let tasksTotal = 0;
    try {
      const state = fs.readFileSync(statePath, 'utf-8');
      const doneMatches = state.match(/DONE/g);
      const pendMatches = state.match(/pendiente/g);
      tasksDone = doneMatches?.length || 0;
      tasksTotal = tasksDone + (pendMatches?.length || 0);
    } catch { /* */ }

    const runLogPath = path.join(this.rootPath, 'loop-run-log.md');
    let lastRun = '';
    try {
      const log = fs.readFileSync(runLogPath, 'utf-8');
      const lines = log.split('\n').filter(l => l.trim());
      lastRun = lines[lines.length - 1]?.substring(0, 80) || '';
    } catch { /* */ }

    const testResultPath = path.join(this.rootPath, 'resultTask');
    let hasTestResults = false;
    try { hasTestResults = fs.existsSync(testResultPath); } catch { /* */ }

    return {
      name: pkg.name || 'UltraIa',
      version: pkg.version || '?',
      workspaces: pkg.workspaces?.length || 0,
      toolCount,
      tasksDone,
      tasksTotal,
      lastRun,
      hasTestResults,
      nodeModules: fs.existsSync(path.join(this.rootPath, 'node_modules')),
    };
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
.container { padding: 12px; height: 100vh; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
h1 { color: var(--primary); font-size: 16px; margin-bottom: 4px; }
.section-title { color: var(--primary); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.stat {
  padding: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 6px;
  display: flex; flex-direction: column; gap: 2px;
}
.stat-label { font-size: 11px; color: var(--text-dim); }
.stat-value { font-size: 14px; font-weight: 600; }
.stat-value.ok { color: var(--success); }
.stat-value.warn { color: var(--warning); }
.stat-value.err { color: var(--error); }
.actions { display: flex; flex-direction: column; gap: 4px; }
.action-btn {
  padding: 8px; background: var(--tool-bg); border: 1px solid var(--tool-border);
  border-radius: 6px; color: var(--text); font-size: 12px; text-align: left; cursor: pointer;
}
.action-btn:hover { border-color: var(--primary); }
.info { font-size: 11px; color: var(--text-dim); padding: 6px; background: var(--panel); border-radius: 4px; }
</style>
</head>
<body>
  <div class="container">
    <h1>UltraIa Dashboard</h1>

    <div class="section-title">Project Info</div>
    <div class="stat-grid">
      <div class="stat"><span class="stat-label">Name</span><span class="stat-value" id="name">-</span></div>
      <div class="stat"><span class="stat-label">Version</span><span class="stat-value" id="version">-</span></div>
      <div class="stat"><span class="stat-label">Workspaces</span><span class="stat-value" id="workspaces">-</span></div>
      <div class="stat"><span class="stat-label">Tools</span><span class="stat-value" id="tools">-</span></div>
      <div class="stat"><span class="stat-label">Tasks</span><span class="stat-value" id="tasks">-</span></div>
      <div class="stat"><span class="stat-label">node_modules</span><span class="stat-value" id="nodeModules">-</span></div>
    </div>

    <div class="section-title">Quick Actions</div>
    <div class="actions">
      <button class="action-btn" onclick="post({type:'runAll'})">Run All Gates</button>
      <button class="action-btn" onclick="post({type:'startDev'})">Start Dev Server</button>
      <button class="action-btn" onclick="post({type:'openWeb'})">Open Web Dashboard</button>
    </div>

    <div class="section-title">Last Activity</div>
    <div class="info" id="lastRun">-</div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function post(msg) { vscode.postMessage(msg); }

    function render(stats) {
      document.getElementById('name').textContent = stats.name;
      document.getElementById('version').textContent = stats.version;
      document.getElementById('workspaces').textContent = stats.workspaces;
      document.getElementById('tools').textContent = stats.toolCount;
      document.getElementById('tasks').textContent = stats.tasksDone + '/' + stats.tasksTotal;
      document.getElementById('nodeModules').textContent = stats.nodeModules ? 'installed' : 'missing';
      document.getElementById('nodeModules').className = 'stat-value ' + (stats.nodeModules ? 'ok' : 'err');
      document.getElementById('lastRun').textContent = stats.lastRun || 'No runs yet';
    }

    window.addEventListener('message', event => {
      if (event.data.type === 'stats') render(event.data);
    });

    post({ type: 'load' });
  </script>
</body>
</html>`;
  }
}
