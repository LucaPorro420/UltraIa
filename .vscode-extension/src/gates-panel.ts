//! Gates Panel - Live CI gate status with one-click run.

import * as vscode from 'vscode';
import { baseCss } from './webview-utils';

export class GatesPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia.gates';
  private view?: vscode.WebviewView;

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'runGate':
          vscode.commands.executeCommand('ultraia.runGate');
          break;
        case 'runAll':
          vscode.commands.executeCommand('ultraia.runAllGates');
          break;
      }
    });
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${baseCss()}
.container { padding: 8px; height: 100vh; display: flex; flex-direction: column; }
.gates { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.gate {
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.gate:hover { border-color: var(--primary); background: var(--tool-bg); }
.gate-icon { font-size: 16px; width: 24px; text-align: center; }
.gate-info { flex: 1; }
.gate-name { font-size: 13px; font-weight: 600; color: var(--text); }
.gate-desc { font-size: 11px; color: var(--text-dim); margin-top: 1px; }
.gate-status { font-size: 11px; color: var(--text-dim); padding: 2px 6px; border-radius: 3px; background: var(--tool-bg); }
.gate-status.running { color: var(--warning); }
.gate-status.pass { color: var(--success); }
.gate-status.fail { color: var(--error); }
.run-all {
  padding: 10px; background: var(--primary); border: none; border-radius: 6px;
  color: white; font-size: 13px; font-weight: 600; cursor: pointer; flex-shrink: 0; margin-top: 8px;
}
.run-all:hover { background: var(--primary-dim); }
.output {
  margin-top: 8px; padding: 8px; background: var(--panel); border: 1px solid var(--border);
  border-radius: 4px; font-family: monospace; font-size: 11px; color: var(--text-dim);
  max-height: 200px; overflow-y: auto; white-space: pre-wrap; display: none;
}
.output.visible { display: block; }
</style>
</head>
<body>
  <div class="container">
    <div class="gates">
      <div class="gate" data-gate="typecheck">
        <div class="gate-icon">TS</div>
        <div class="gate-info">
          <div class="gate-name">Typecheck</div>
          <div class="gate-desc">tsc --noEmit (core + web)</div>
        </div>
        <div class="gate-status" id="status-typecheck">idle</div>
      </div>
      <div class="gate" data-gate="lint">
        <div class="gate-icon">LT</div>
        <div class="gate-info">
          <div class="gate-name">Lint</div>
          <div class="gate-desc">next lint</div>
        </div>
        <div class="gate-status" id="status-lint">idle</div>
      </div>
      <div class="gate" data-gate="test">
        <div class="gate-icon">T</div>
        <div class="gate-info">
          <div class="gate-name">Tests</div>
          <div class="gate-desc">vitest run</div>
        </div>
        <div class="gate-status" id="status-test">idle</div>
      </div>
      <div class="gate" data-gate="build">
        <div class="gate-icon">B</div>
        <div class="gate-info">
          <div class="gate-name">Build</div>
          <div class="gate-desc">next build (production)</div>
        </div>
        <div class="gate-status" id="status-build">idle</div>
      </div>
    </div>
    <button class="run-all" onclick="post({type:'runAll'})">Run All Gates (CI sequence)</button>
    <div class="output" id="output"></div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function post(msg) { vscode.postMessage(msg); }
  </script>
</body>
</html>`;
  }
}
