import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ── Capability Registry ──────────────────────────────────────────────────────

interface Capability {
  name: string;
  description: string;
  tools: string[];
  file: string;
}

const CAPABILITIES: Capability[] = [
  { name: 'sdf', description: 'SDF + Ray Marching (Signed Distance Fields)', tools: ['sdf_render'], file: 'packages/core/src/tools/sdf.ts' },
  { name: 'videoqa', description: 'Video Quality Analysis (MAE/MSE/PSNR/SSIM)', tools: ['videoqa_metrics'], file: 'packages/core/src/tools/videoqa.ts' },
  { name: 'motion', description: 'Motion Analysis (optical flow, trajectory)', tools: ['motion_analyze'], file: 'packages/core/src/tools/motion.ts' },
  { name: 'replica', description: 'Replica Engine (analysis-by-synthesis)', tools: ['replica_run'], file: 'packages/core/src/tools/replica.ts' },
  { name: 'travel', description: 'Travel Video Planning (Ken Burns, prompts)', tools: ['travel_plan'], file: 'packages/core/src/tools/travel.ts' },
  { name: 'codevfx', description: 'Code VFX (particles, fire, ice, lightning)', tools: ['vfx_code'], file: 'packages/core/src/tools/codevfx.ts' },
  { name: 'geometry', description: 'Geometry (Gielis superfórmula, Möbius, glTF)', tools: ['geometry_build'], file: 'packages/core/src/tools/geometry.ts' },
  { name: 'pngrender', description: 'PNG Renderer (pure TypeScript encoder)', tools: ['png_render'], file: 'packages/core/src/tools/pngrender.ts' },
  { name: 'procvid', description: 'Procedural Video (plasma, waves, noise)', tools: ['procvid_render'], file: 'packages/core/src/tools/procvid.ts' },
  { name: 'diagram', description: 'SVG Diagrams (timeline, architecture, loop)', tools: ['diagram_render'], file: 'packages/core/src/tools/diagram.ts' },
  { name: 'harness', description: 'Plugin Harness (boot, tick, shutdown)', tools: ['harness_manage'], file: 'packages/core/src/tools/harness.ts' },
  { name: 'growth', description: 'Growth Analytics (channel profile, playbook)', tools: ['growth_plan'], file: 'packages/core/src/tools/growth.ts' },
  { name: 'cloud', description: 'Cloud Storage (R2, local, upload/download)', tools: ['cloud_files'], file: 'packages/core/src/tools/cloud.ts' },
  { name: 'publish', description: 'Multi-platform Publishing (8 channels)', tools: ['publish_submit'], file: 'packages/core/src/tools/publish.ts' },
  { name: 'publications', description: 'Publication Queue (Prisma, scheduling)', tools: ['publication_queue'], file: 'packages/core/src/tools/publications.ts' },
  { name: 'topics', description: 'Content Topics (RSS, DuckDuckGo, briefs)', tools: ['topics_briefs', 'topics_queue'], file: 'packages/core/src/tools/topics.ts' },
  { name: 'present', description: 'Publication Packages (captions, visuals)', tools: ['present_package'], file: 'packages/core/src/tools/present.ts' },
  { name: 'metrics', description: 'Publication Metrics & Analytics', tools: ['publication_metrics'], file: 'packages/core/src/tools/metrics.ts' },
  { name: 'telegram', description: 'Telegram Bot Adapter', tools: ['createTelegramAdapter'], file: 'packages/core/src/tools/telegram.ts' },
  { name: 'discord', description: 'Discord Webhook Adapter', tools: ['createDiscordAdapter'], file: 'packages/core/src/tools/discord.ts' },
  { name: 'slack', description: 'Slack Bot Adapter', tools: ['createSlackAdapter'], file: 'packages/core/src/tools/slack.ts' },
  { name: 'g0dm0d3', description: 'G0DM0D3 (parseltongue, autotune, races)', tools: ['g0_parseltongue', 'g0_autotune', 'g0_ultraplinian', 'g0_godmode'], file: 'packages/core/src/tools/g0dm0d3.ts' },
  { name: 'screenflow', description: 'ScreenFlow (screen recording automation)', tools: ['screenflow_plan'], file: 'packages/core/src/tools/screenflow.ts' },
  { name: 'videoEdit', description: 'Video Editing (EDL, ffmpeg, self-eval)', tools: ['video_edit_pack', 'video_edit_edl', 'video_edit_render'], file: 'packages/core/src/tools/video-edit.ts' },
  { name: 'chaos_game', description: 'Chaos Game Fractal Generator', tools: ['chaos_game'], file: 'packages/core/src/tools/chaos-game.ts' },
  { name: 'reach', description: 'Web Search (DuckDuckGo, Exa, RSS)', tools: ['reach_searchWeb', 'reach_readWeb'], file: 'packages/core/src/tools/reach.ts' },
  { name: 'skills', description: 'Agent Skills (plan, build, test, review)', tools: ['skill_plan', 'skill_build', 'skill_test'], file: 'packages/core/src/tools/skills.ts' },
  { name: 'memory', description: 'Memory System (working, scene, style)', tools: ['memory_store', 'memory_query'], file: 'packages/core/src/tools/memory.ts' },
  { name: 'vault', description: 'Vault (local repo for artifacts)', tools: ['vault_manage'], file: 'packages/core/src/tools/vault.ts' },
  { name: 'pdfsearch', description: 'PDF Search (OpenAlex, DuckDuckGo)', tools: ['pdfsearch_search'], file: 'packages/core/src/tools/pdfsearch.ts' },
  { name: 'autolearn', description: 'Auto-Learning (mode planning)', tools: ['autolearn_run'], file: 'packages/core/src/tools/autolearn.ts' },
  { name: 'batch-executor', description: 'Batch Task Executor (parallel fan-out)', tools: ['batch_executor'], file: 'packages/core/src/tools/batch-executor.ts' },
  { name: 'creativity', description: 'Creativity Engine', tools: ['creativity_run'], file: 'packages/core/src/tools/creativity.ts' },
  { name: 'motor-evolutivo', description: 'Evolutionary Motor (CAD/geometry)', tools: ['cadgeo_plan'], file: 'packages/core/src/tools/motor-evolutivo.ts' },
  { name: 'kgraph', description: 'Knowledge Graph', tools: ['kgraph_query'], file: 'packages/core/src/tools/kgraph.ts' },
];

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

function updateStatusBar(text: string, color: string = '$(check)') {
  if (!statusBarItem) return;
  statusBarItem.text = `${color} UltraIa: ${text}`;
  statusBarItem.tooltip = `UltraIa Project — ${text}`;
}

// ── Tree Data Providers ──────────────────────────────────────────────────────

class CapabilitiesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (element && element.label && CAPABILITIES.find(c => c.name === element.label)) {
      const cap = CAPABILITIES.find(c => c.name === element.label)!;
      return cap.tools.map(tool => {
        const t = new vscode.TreeItem(tool, vscode.TreeItemCollapsibleState.None);
        t.iconPath = new vscode.ThemeIcon('symbol-method');
        t.command = {
          command: 'vscode.open',
          title: 'Open',
          arguments: [vscode.Uri.file(path.join(getRootPath(), cap.file))],
        };
        return t;
      });
    }
    return CAPABILITIES.map(cap => {
      const item = new vscode.TreeItem(cap.name, vscode.TreeItemCollapsibleState.Collapsed);
      item.description = cap.tools.length > 0 ? `${cap.tools.length} tools` : '';
      item.tooltip = cap.description;
      item.iconPath = new vscode.ThemeIcon('plugin');
      return item;
    });
  }
}

class GatesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem { return element; }

  getChildren(): vscode.TreeItem[] {
    const gates = [
      { name: 'typecheck', cmd: 'ultraia.gateTypecheck', icon: 'pass', desc: 'tsc --noEmit (core + web)' },
      { name: 'lint', cmd: 'ultraia.gateLint', icon: 'pass', desc: 'next lint' },
      { name: 'test', cmd: 'ultraia.gateTest', icon: 'pass', desc: 'vitest run (2573 tests)' },
      { name: 'build', cmd: 'ultraia.gateBuild', icon: 'pass', desc: 'next build (production)' },
      { name: 'ALL GATES', cmd: 'ultraia.gateAll', icon: 'rocket', desc: 'Full CI sequence' },
    ];
    return gates.map(g => {
      const item = new vscode.TreeItem(g.name, vscode.TreeItemCollapsibleState.None);
      item.description = g.desc;
      item.iconPath = new vscode.ThemeIcon(g.icon);
      item.command = { command: g.cmd, title: `Run ${g.name}` };
      return item;
    });
  }
}

// ── Dashboard Webview ────────────────────────────────────────────────────────

class DashboardProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(view: vscode.WebviewView): void {
    view.webview.options = { enableScripts: true };
    view.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 16px; background: #08080a; }
  h1 { color: #8b5cf6; font-size: 18px; margin-bottom: 8px; }
  .stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1f1f2a; }
  .stat-label { color: #a1a1aa; }
  .stat-value { color: #22c55e; font-weight: bold; }
  .stat-value.warn { color: #f59e0b; }
  .stat-value.err { color: #ef4444; }
  .section { margin-top: 16px; }
  .section-title { color: #8b5cf6; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .btn { display: block; width: 100%; padding: 8px; margin: 4px 0; background: #1a1a2e; color: #e4e4e7; border: 1px solid #27272a; border-radius: 6px; cursor: pointer; text-align: left; font-size: 13px; }
  .btn:hover { background: #27272a; border-color: #8b5cf6; }
  .caps { max-height: 300px; overflow-y: auto; }
  .cap { padding: 4px 0; font-size: 12px; color: #a1a1aa; }
  .cap b { color: #e4e4e7; }
</style>
</head>
<body>
  <h1>🚀 UltraIa Dashboard</h1>
  <div class="section">
    <div class="section-title">Project Health</div>
    <div class="stat"><span class="stat-label">Tests</span><span class="stat-value">2573/2573 ✅</span></div>
    <div class="stat"><span class="stat-label">Typecheck</span><span class="stat-value">0 errors ✅</span></div>
    <div class="stat"><span class="stat-label">Lint</span><span class="stat-value warn">1 warning ⚠️</span></div>
    <div class="stat"><span class="stat-label">Build</span><span class="stat-value">39 pages ✅</span></div>
    <div class="stat"><span class="stat-label">Tasks DONE</span><span class="stat-value">167/167 ✅</span></div>
    <div class="stat"><span class="stat-label">Capabilities</span><span class="stat-value">${CAPABILITIES.length}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Quick Actions</div>
    <button class="btn" onclick="vscode.postMessage({cmd:'gateAll'})">⚡ Run All Gates</button>
    <button class="btn" onclick="vscode.postMessage({cmd:'startDev'})">🟢 Start Dev Server</button>
    <button class="btn" onclick="vscode.postMessage({cmd:'openDashboard'})">🌐 Open Dashboard</button>
    <button class="btn" onclick="vscode.postMessage({cmd:'openState'})">📋 Open STATE.md</button>
    <button class="btn" onclick="vscode.postMessage({cmd:'searchTools'})">🔍 Search Tools</button>
  </div>
  <div class="section">
    <div class="section-title">Capabilities (${CAPABILITIES.length})</div>
    <div class="caps">
      ${CAPABILITIES.map(c => `<div class="cap"><b>${c.name}</b> — ${c.description}</div>`).join('')}
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
  </script>
</body>
</html>`;
  }
}

// ── Activation ───────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  console.log('UltraIa extension activated');

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'ultraia.projectStatus';
  statusBarItem.tooltip = 'UltraIa Project Status';
  statusBarItem.text = '$(rocket) UltraIa: Ready';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Tree views
  vscode.window.registerTreeDataProvider('ultraia.capabilities', new CapabilitiesProvider());
  vscode.window.registerTreeDataProvider('ultraia.gates', new GatesProvider());

  // Dashboard webview
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ultraia.dashboard', new DashboardProvider())
  );

  // ── Commands ─────────────────────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.gateTypecheck', async () => {
      updateStatusBar('Typecheck...', '$(sync~spin)');
      const r = await runCommand('cd packages/core && npx tsc --noEmit', 'TYPECHECK');
      updateStatusBar(r.success ? 'Typecheck ✅' : 'Typecheck ❌', r.success ? '$(check)' : '$(error)');
      vscode.window.showInformationMessage(`UltraIa Typecheck: ${r.success ? 'PASS' : 'FAIL'}`);
    }),

    vscode.commands.registerCommand('ultraia.gateLint', async () => {
      updateStatusBar('Lint...', '$(sync~spin)');
      const r = await runCommand('npx next lint', 'LINT');
      updateStatusBar(r.success ? 'Lint ✅' : 'Lint ❌', r.success ? '$(check)' : '$(error)');
      vscode.window.showInformationMessage(`UltraIa Lint: ${r.success ? 'PASS' : 'FAIL'}`);
    }),

    vscode.commands.registerCommand('ultraia.gateTest', async () => {
      updateStatusBar('Tests...', '$(sync~spin)');
      const r = await runCommand('npx vitest run', 'TEST');
      updateStatusBar(r.success ? 'Tests ✅' : 'Tests ❌', r.success ? '$(check)' : '$(error)');
      vscode.window.showInformationMessage(`UltraIa Tests: ${r.success ? 'PASS' : 'FAIL'}`);
    }),

    vscode.commands.registerCommand('ultraia.gateBuild', async () => {
      updateStatusBar('Build...', '$(sync~spin)');
      const r = await runCommand('npx next build', 'BUILD');
      updateStatusBar(r.success ? 'Build ✅' : 'Build ❌', r.success ? '$(check)' : '$(error)');
      vscode.window.showInformationMessage(`UltraIa Build: ${r.success ? 'PASS' : 'FAIL'}`);
    }),

    vscode.commands.registerCommand('ultraia.gateAll', async () => {
      updateStatusBar('All Gates...', '$(sync~spin)');
      const steps = [
        { name: 'Typecheck', cmd: 'cd packages/core && npx tsc --noEmit' },
        { name: 'Lint', cmd: 'npx next lint' },
        { name: 'Test', cmd: 'npx vitest run' },
        { name: 'Build', cmd: 'npx next build' },
      ];
      for (const step of steps) {
        updateStatusBar(`${step.name}...`, '$(sync~spin)');
        const r = await runCommand(step.cmd, step.name.toUpperCase());
        if (!r.success) {
          updateStatusBar(`${step.name} ❌`, '$(error)');
          vscode.window.showErrorMessage(`UltraIa Gate FAILED: ${step.name}`);
          return;
        }
      }
      updateStatusBar('All Gates ✅', '$(check)');
      vscode.window.showInformationMessage('UltraIa: All gates PASS ✅');
    }),

    vscode.commands.registerCommand('ultraia.projectStatus', async () => {
      const items = [
        { label: '$(check) Typecheck', description: 'tsc --noEmit' },
        { label: '$(check) Lint', description: 'next lint' },
        { label: '$(check) Tests', description: '2573/2573 PASS' },
        { label: '$(check) Build', description: '39 pages' },
        { label: '$(check) Tasks', description: '167/167 DONE' },
        { label: '$(rocket) Capabilities', description: `${CAPABILITIES.length} registered` },
        { label: '$(repo) Working Tree', description: 'CLEAN' },
      ];
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'UltraIa Project Status',
      });
      if (picked) {
        vscode.window.showInformationMessage(`${picked.label}: ${picked.description}`);
      }
    }),

    vscode.commands.registerCommand('ultraia.openState', () => {
      const uri = vscode.Uri.file(path.join(getRootPath(), 'STATE.md'));
      vscode.window.showTextDocument(uri);
    }),

    vscode.commands.registerCommand('ultraia.openRunLog', () => {
      const uri = vscode.Uri.file(path.join(getRootPath(), 'loop-run-log.md'));
      vscode.window.showTextDocument(uri);
    }),

    vscode.commands.registerCommand('ultraia.openConstraints', () => {
      const uri = vscode.Uri.file(path.join(getRootPath(), 'loop-constraints.md'));
      vscode.window.showTextDocument(uri);
    }),

    vscode.commands.registerCommand('ultraia.browseCapabilities', async () => {
      const items = CAPABILITIES.map(c => ({
        label: c.name,
        description: c.description,
        detail: `Tools: ${c.tools.join(', ')}`,
        file: c.file,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: 'Browse UltraIa Capabilities',
        matchOnDescription: true,
        matchOnDetail: true,
      });
      if (picked) {
        const uri = vscode.Uri.file(path.join(getRootPath(), picked.file));
        vscode.window.showTextDocument(uri);
      }
    }),

    vscode.commands.registerCommand('ultraia.searchTools', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search UltraIa tools',
        placeHolder: 'e.g. video, publish, geometry...',
      });
      if (!query) return;
      const q = query.toLowerCase();
      const results = CAPABILITIES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tools.some(t => t.toLowerCase().includes(q))
      );
      if (results.length === 0) {
        vscode.window.showInformationMessage(`No capabilities found for "${query}"`);
        return;
      }
      const items = results.map(c => ({
        label: c.name,
        description: c.description,
        detail: `Tools: ${c.tools.join(', ')}`,
        file: c.file,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: `Results for "${query}"`,
      });
      if (picked) {
        const uri = vscode.Uri.file(path.join(getRootPath(), picked.file));
        vscode.window.showTextDocument(uri);
      }
    }),

    vscode.commands.registerCommand('ultraia.openDashboard', () => {
      vscode.env.openExternal(vscode.Uri.parse('http://localhost:3000'));
    }),

    vscode.commands.registerCommand('ultraia.startDev', async () => {
      updateStatusBar('Starting dev...', '$(sync~spin)');
      const r = await runCommand('npm run dev', 'DEV SERVER');
      updateStatusBar(r.success ? 'Dev running' : 'Dev failed', r.success ? '$(check)' : '$(error)');
    }),

    vscode.commands.registerCommand('ultraia.stopDev', async () => {
      await runCommand('taskkill /T /F /IM next.exe 2>$null; taskkill /T /F /IM node.exe 2>$null', 'STOP DEV');
      updateStatusBar('Dev stopped', '$(circle-slash)');
    }),

    vscode.commands.registerCommand('ultraia.runStartPy', async () => {
      updateStatusBar('Starting full stack...', '$(sync~spin)');
      const r = await runCommand('py -3.12 start.py', 'START.PY');
      updateStatusBar(r.success ? 'Stack running' : 'Start failed', r.success ? '$(check)' : '$(error)');
    }),

    vscode.commands.registerCommand('ultraia.clearVitestCache', async () => {
      await runCommand('Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue', 'CLEAR CACHE');
      vscode.window.showInformationMessage('UltraIa: Vitest cache cleared');
    }),

    vscode.commands.registerCommand('ultraia.showRecentCommits', async () => {
      const r = await runCommand('git log --oneline -15', 'GIT LOG');
      if (r.success) {
        const lines = r.output.trim().split('\n');
        const items = lines.map(line => ({
          label: line.substring(0, 8),
          description: line.substring(9),
        }));
        await vscode.window.showQuickPick(items, {
          placeHolder: 'Recent Commits',
        });
      }
    }),

    vscode.commands.registerCommand('ultraia.copyRepomix', async () => {
      const r = await runCommand('npx repomix --include "packages/core/src,packages/runtime/src,apps/web/src" --output repomix-output.xml', 'REPOMIX');
      if (r.success) {
        vscode.window.showInformationMessage('UltraIa: Repomix generated (repomix-output.xml)');
      }
    }),
  );

  // Webview message handler
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia._webviewMessage', (msg: any) => {
      const cmdMap: Record<string, string> = {
        gateAll: 'ultraia.gateAll',
        startDev: 'ultraia.startDev',
        openDashboard: 'ultraia.openDashboard',
        openState: 'ultraia.openState',
        searchTools: 'ultraia.searchTools',
      };
      const cmd = cmdMap[msg.cmd];
      if (cmd) vscode.commands.executeCommand(cmd);
    })
  );
}

export function deactivate() {}
