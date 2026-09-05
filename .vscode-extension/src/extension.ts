//! UltraIa VS Code Extension - Main Entry Point
// Registers all panels, commands, and providers.

import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { UltraIaAgent } from './agent';
import { ChatPanel } from './chat-panel';
import { HistoryPanel } from './history-panel';
import { MemoryPanel } from './memory-panel';
import { SkillsPanel } from './skills-panel';
import { GatesPanel } from './gates-panel';
import { DashboardPanel } from './dashboard-panel';
import { FilesProvider } from './files-provider';

const execAsync = promisify(exec);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRootPath(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
}

async function runCommand(cmd: string, label: string): Promise<{ success: boolean; output: string }> {
  const channel = vscode.window.createOutputChannel('UltraIa');
  channel.appendLine(`\n${'='.repeat(60)}`);
  channel.appendLine(`[${label}] ${cmd}`);
  channel.appendLine(`${'='.repeat(60)}\n`);
  channel.show(true);

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: getRootPath(),
      maxBuffer: 1024 * 1024 * 10,
      timeout: 300000,
    });
    channel.appendLine(stdout);
    if (stderr) channel.appendLine(stderr);
    return { success: true, output: stdout };
  } catch (err: any) {
    channel.appendLine(err.stdout || '');
    channel.appendLine(err.stderr || err.message);
    return { success: false, output: err.stderr || err.message };
  }
}

// ── Status Bar ───────────────────────────────────────────────────────────────

let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(text: string, icon: string = '$(check)') {
  if (!statusBarItem) return;
  statusBarItem.text = `${icon} UltraIa: ${text}`;
  statusBarItem.tooltip = `UltraIa Project — ${text}`;
}

// ── Activation ───────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  console.log('UltraIa extension activated');

  const rootPath = getRootPath();

  // ── Core Agent ───────────────────────────────────────────────────────────
  const agent = new UltraIaAgent(rootPath);

  // ── Panels ───────────────────────────────────────────────────────────────
  const chatPanel = new ChatPanel(agent);
  const historyPanel = new HistoryPanel(agent);
  const memoryPanel = new MemoryPanel(agent);
  const skillsPanel = new SkillsPanel(agent);
  const gatesPanel = new GatesPanel();
  const dashboardPanel = new DashboardPanel(rootPath);
  const filesProvider = new FilesProvider(rootPath);

  // Register webview providers
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(ChatPanel.viewType, chatPanel),
    vscode.window.registerWebviewViewProvider(HistoryPanel.viewType, historyPanel),
    vscode.window.registerWebviewViewProvider(MemoryPanel.viewType, memoryPanel),
    vscode.window.registerWebviewViewProvider(SkillsPanel.viewType, skillsPanel),
    vscode.window.registerWebviewViewProvider(GatesPanel.viewType, gatesPanel),
    vscode.window.registerWebviewViewProvider(DashboardPanel.viewType, dashboardPanel),
    vscode.window.registerTreeDataProvider('ultraia.files', filesProvider),
  );

  // ── Status Bar ───────────────────────────────────────────────────────────
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'ultraia.projectStatus';
  statusBarItem.tooltip = 'UltraIa Project Status';
  statusBarItem.text = '$(rocket) UltraIa: Ready';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ── Commands ─────────────────────────────────────────────────────────────

  // Panel openers
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.openChat', () => {
      vscode.commands.executeCommand('ultraia.chat.focus');
    }),
    vscode.commands.registerCommand('ultraia.openHistory', () => {
      vscode.commands.executeCommand('ultraia.history.focus');
    }),
    vscode.commands.registerCommand('ultraia.openMemory', () => {
      vscode.commands.executeCommand('ultraia.memory.focus');
    }),
    vscode.commands.registerCommand('ultraia.openSkills', () => {
      vscode.commands.executeCommand('ultraia.skills.focus');
    }),
    vscode.commands.registerCommand('ultraia.openFiles', () => {
      vscode.commands.executeCommand('ultraia.files.focus');
    }),
    vscode.commands.registerCommand('ultraia.openGates', () => {
      vscode.commands.executeCommand('ultraia.gates.focus');
    }),
    vscode.commands.registerCommand('ultraia.openDashboard', () => {
      vscode.commands.executeCommand('ultraia.dashboard.focus');
    }),
  );

  // Gate commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.runGate', async () => {
      const gate = await vscode.window.showQuickPick(
        ['typecheck', 'lint', 'test', 'build', 'all'],
        { placeHolder: 'Select gate to run' }
      );
      if (!gate) return;
      updateStatusBar(`Running ${gate}...`, '$(sync~spin)');
      const cmd = gate === 'all' ? 'npm run gate' : `npm run ${gate}`;
      const r = await runCommand(cmd, gate.toUpperCase());
      updateStatusBar(r.success ? `${gate} PASS` : `${gate} FAIL`, r.success ? '$(check)' : '$(error)');
      vscode.window.showInformationMessage(`UltraIa ${gate}: ${r.success ? 'PASS' : 'FAIL'}`);
    }),
    vscode.commands.registerCommand('ultraia.runAllGates', async () => {
      updateStatusBar('All Gates...', '$(sync~spin)');
      const steps = [
        { name: 'Typecheck', cmd: 'npm run typecheck' },
        { name: 'Lint', cmd: 'npm run lint' },
        { name: 'Test', cmd: 'npm run test' },
        { name: 'Build', cmd: 'npm run build' },
      ];
      for (const step of steps) {
        updateStatusBar(`${step.name}...`, '$(sync~spin)');
        const r = await runCommand(step.cmd, step.name.toUpperCase());
        if (!r.success) {
          updateStatusBar(`${step.name} FAIL`, '$(error)');
          vscode.window.showErrorMessage(`UltraIa Gate FAILED: ${step.name}`);
          return;
        }
      }
      updateStatusBar('All Gates PASS', '$(check)');
      vscode.window.showInformationMessage('UltraIa: All gates PASS');
    }),
  );

  // Dev server
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.startDev', async () => {
      updateStatusBar('Starting dev...', '$(sync~spin)');
      const r = await runCommand('npm run dev', 'DEV SERVER');
      updateStatusBar(r.success ? 'Dev running' : 'Dev failed', r.success ? '$(check)' : '$(error)');
    }),
    vscode.commands.registerCommand('ultraia.stopDev', async () => {
      await runCommand('taskkill /T /F /IM next.exe 2>$null; taskkill /T /F /IM node.exe 2>$null', 'STOP DEV');
      updateStatusBar('Dev stopped', '$(circle-slash)');
    }),
    vscode.commands.registerCommand('ultraia.openDashboardWeb', () => {
      vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000'));
    }),
  );

  // Agent commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.explainFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showWarningMessage('No active file'); return; }
      const relPath = path.relative(rootPath, editor.document.uri.fsPath);
      chatPanel.sendToChat(`Explain what this file does: ${relPath}`);
      vscode.commands.executeCommand('ultraia.chat.focus');
    }),
    vscode.commands.registerCommand('ultraia.fixFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showWarningMessage('No active file'); return; }
      const relPath = path.relative(rootPath, editor.document.uri.fsPath);
      chatPanel.sendToChat(`Review and fix any issues in: ${relPath}`);
      vscode.commands.executeCommand('ultraia.chat.focus');
    }),
    vscode.commands.registerCommand('ultraia.searchCode', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search code',
        placeHolder: 'e.g. "function that handles auth"',
      });
      if (query) {
        chatPanel.sendToChat(`Search the codebase for: ${query}`);
        vscode.commands.executeCommand('ultraia.chat.focus');
      }
    }),
    vscode.commands.registerCommand('ultraia.clearSession', () => {
      agent.clearSession();
      vscode.window.showInformationMessage('UltraIa Agent: Session cleared');
    }),
    vscode.commands.registerCommand('ultraia.exportSession', async () => {
      const data = agent.exportSession();
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(path.join(rootPath, '.ultraia', 'agent-session.json')),
        filters: { JSON: ['json'] },
      });
      if (uri) {
        require('fs').writeFileSync(uri.fsPath, data);
        vscode.window.showInformationMessage(`Session exported to ${uri.fsPath}`);
      }
    }),
    vscode.commands.registerCommand('ultraia.projectStatus', async () => {
      const items = [
        { label: '$(check) Typecheck', description: 'tsc --noEmit' },
        { label: '$(check) Lint', description: 'next lint' },
        { label: '$(check) Tests', description: 'vitest run' },
        { label: '$(check) Build', description: 'next build' },
        { label: '$(rocket) Capabilities', description: '58+ registered' },
      ];
      const picked = await vscode.window.showQuickPick(items, { placeHolder: 'UltraIa Project Status' });
      if (picked) {
        vscode.window.showInformationMessage(`${picked.label}: ${picked.description}`);
      }
    }),
  );

  // Initial status
  updateStatusBar('Ready', '$(rocket)');
}

export function deactivate() {}
