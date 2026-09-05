//! UltraIa Agent Backend
// Connects the Cognitive Agent System to the VS Code extension.
// Handles LLM calls (Ollama/local), tool execution, session memory, and persistence.

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  sessionId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  success: boolean;
  output: string;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: AgentMessage[];
  createdAt: number;
  lastActivityAt: number;
  model: string;
}

export interface AgentConfig {
  llmUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  runtimeUrl?: string;
  email?: string;
  password?: string;
}

export interface MemoryEntry {
  id: string;
  content: string;
  layer: 'working' | 'episodic' | 'semantic' | 'metacognitive';
  tags: string[];
  createdAt: number;
  importance: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

// ── Tool Registry ────────────────────────────────────────────────────────────

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): ToolDefinition[] {
    return this.getAll().filter(t => t.category === category);
  }

  getCategories(): string[] {
    const cats = new Set(this.getAll().map(t => t.category));
    return Array.from(cats).sort();
  }

  getSchema(): Array<{ name: string; description: string; category: string; parameters: Record<string, { type: string; description: string; required?: boolean }> }> {
    return this.getAll().map(t => ({
      name: t.name,
      description: t.description,
      category: t.category,
      parameters: t.parameters,
    }));
  }
}

// ── Built-in Tools ───────────────────────────────────────────────────────────

function registerBuiltinTools(registry: ToolRegistry, rootPath: string): void {
  const tools: ToolDefinition[] = [
    {
      name: 'read_file',
      description: 'Read the contents of a file in the project',
      category: 'files',
      parameters: {
        path: { type: 'string', description: 'Relative path to the file', required: true },
      },
      execute: async (args) => {
        const filePath = path.join(rootPath, args.path as string);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');
          return lines.length > 200
            ? lines.slice(0, 200).join('\n') + `\n\n... (${lines.length} total lines)`
            : content;
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      },
    },
    {
      name: 'list_files',
      description: 'List files in a directory',
      category: 'files',
      parameters: {
        path: { type: 'string', description: 'Relative directory path (default: root)' },
        pattern: { type: 'string', description: 'Glob pattern (e.g. "**/*.ts")' },
      },
      execute: async (args) => {
        const dir = path.join(rootPath, (args.path as string) || '.');
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          return entries.map(e => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`).join('\n');
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      },
    },
    {
      name: 'run_command',
      description: 'Run a shell command in the project root',
      category: 'shell',
      parameters: {
        command: { type: 'string', description: 'Shell command to execute', required: true },
        timeout: { type: 'number', description: 'Timeout in ms (default: 60000)' },
      },
      execute: async (args) => {
        try {
          const { stdout, stderr } = await execAsync(args.command as string, {
            cwd: rootPath,
            maxBuffer: 1024 * 1024 * 5,
            timeout: (args.timeout as number) || 60000,
          });
          return stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
        } catch (err: any) {
          return `Error: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}`;
        }
      },
    },
    {
      name: 'grep',
      description: 'Search for a pattern in project files',
      category: 'search',
      parameters: {
        pattern: { type: 'string', description: 'Regex pattern to search for', required: true },
        include: { type: 'string', description: 'File pattern to include (e.g. "*.ts")' },
      },
      execute: async (args) => {
        try {
          const includeArg = args.include ? `--include "${args.include}"` : '';
          const { stdout } = await execAsync(
            `rg -n "${args.pattern}" ${includeArg} --max-count 20`,
            { cwd: rootPath, maxBuffer: 1024 * 1024 }
          );
          return stdout || 'No matches found';
        } catch (err: any) {
          return err.stdout || 'No matches found';
        }
      },
    },
    {
      name: 'git_status',
      description: 'Get git status of the project',
      category: 'git',
      parameters: {},
      execute: async () => {
        try {
          const { stdout: status } = await execAsync('git status --short', { cwd: rootPath });
          const { stdout: log } = await execAsync('git log --oneline -5', { cwd: rootPath });
          return `Status:\n${status || 'Clean'}\n\nRecent commits:\n${log}`;
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      },
    },
    {
      name: 'run_gates',
      description: 'Run CI gates (typecheck, lint, test, build). With gate=all, runs ALL gates even if some fail, and reports each result separately.',
      category: 'ci',
      parameters: {
        gate: { type: 'string', description: 'Which gate: typecheck, lint, test, build, or all (default: all)' },
      },
      execute: async (args) => {
        const gate = (args.gate as string) || 'all';
        const gates: Record<string, string> = {
          typecheck: 'npm run typecheck',
          lint: 'npm run lint',
          test: 'npm run test',
          build: 'npm run build',
        };
        if (gate === 'all') {
          const results: string[] = [];
          let passCount = 0;
          let failCount = 0;
          for (const [name, cmd] of Object.entries(gates)) {
            try {
              const { stdout } = await execAsync(cmd, { cwd: rootPath, timeout: 300000 });
              const short = stdout.split('\n').filter(l => l.trim()).slice(-3).join('\n');
              results.push(`✅ PASS ${name}\n${short}`);
              passCount++;
            } catch (err: any) {
              const output = err.stderr || err.stdout || err.message;
              const errors = output.split('\n').filter((l: string) =>
                l.includes('error TS') || l.includes('Error:') || l.includes('FAIL') ||
                l.includes('✗') || l.includes('×') || l.includes('ERROR')
              ).slice(0, 20).join('\n');
              results.push(`❌ FAIL ${name}\n${errors || output.split('\n').slice(0, 15).join('\n')}`);
              failCount++;
            }
          }
          return `GATES: ${passCount}/${passCount + failCount} passed\n\n${results.join('\n\n')}`;
        }
        const cmd = gates[gate];
        if (!cmd) return `Unknown gate: ${gate}. Available: ${Object.keys(gates).join(', ')}`;
        try {
          const { stdout } = await execAsync(cmd, { cwd: rootPath, timeout: 300000 });
          return `PASS ${gate}\n${stdout}`;
        } catch (err: any) {
          return `FAIL ${gate}\n${err.stderr || err.message}`;
        }
      },
    },
    {
      name: 'diagnose',
      description: 'Run a specific gate and extract structured error info (file, line, message). Use this BEFORE trying to fix errors — it tells you exactly what to fix.',
      category: 'ci',
      parameters: {
        gate: { type: 'string', description: 'Which gate: typecheck, lint, test, or build', required: true },
      },
      execute: async (args) => {
        const gate = args.gate as string;
        const gates: Record<string, string> = {
          typecheck: 'npx tsc --noEmit 2>&1',
          lint: 'npm run lint 2>&1',
          test: 'npm run test 2>&1',
          build: 'npm run build 2>&1',
        };
        const cmd = gates[gate];
        if (!cmd) return `Unknown gate: ${gate}. Available: ${Object.keys(gates).join(', ')}`;
        try {
          const { stdout } = await execAsync(cmd, { cwd: rootPath, timeout: 300000 });
          return `✅ ${gate} PASS — no errors found`;
        } catch (err: any) {
          const output = (err.stderr || err.stdout || err.message) as string;
          if (gate === 'typecheck') {
            const errors = output.split('\n')
              .filter((l: string) => l.includes('error TS'))
              .map((l: string) => {
                const m = l.match(/^(.+?)\((\d+),\d+\): error TS\d+:\s*(.+)$/);
                if (m) return { file: m[1], line: parseInt(m[2]), message: m[3], raw: l };
                return { file: '?', line: 0, message: l.trim(), raw: l };
              });
            if (errors.length === 0) return `❌ ${gate} FAIL (no parseable TS errors)\n${output.split('\n').slice(0, 10).join('\n')}`;
            const byFile: Record<string, typeof errors> = {};
            for (const e of errors) { (byFile[e.file] ??= []).push(e); }
            const summary = Object.entries(byFile).map(([f, errs]) =>
              `${f}:\n${errs.map(e => `  L${e.line}: ${e.message}`).join('\n')}`
            ).join('\n\n');
            return `❌ ${gate} FAIL — ${errors.length} error(s) in ${Object.keys(byFile).length} file(s)\n\n${summary}`;
          }
          if (gate === 'lint') {
            const errors = output.split('\n')
              .filter((l: string) => l.includes('error ') || l.includes('Warning '))
              .slice(0, 30);
            return errors.length > 0
              ? `❌ ${gate} FAIL — ${errors.length} issue(s):\n${errors.join('\n')}`
              : `❌ ${gate} FAIL\n${output.split('\n').slice(0, 15).join('\n')}`;
          }
          if (gate === 'test') {
            const fails = output.split('\n')
              .filter((l: string) => l.includes('FAIL') || l.includes('AssertionError') || l.includes('expected'))
              .slice(0, 20);
            return fails.length > 0
              ? `❌ ${gate} FAIL — test failures:\n${fails.join('\n')}`
              : `❌ ${gate} FAIL\n${output.split('\n').slice(0, 20).join('\n')}`;
          }
          return `❌ ${gate} FAIL\n${output.split('\n').slice(0, 20).join('\n')}`;
        }
      },
    },
    {
      name: 'memory_store',
      description: 'Store a memory in the cognitive system',
      category: 'memory',
      parameters: {
        content: { type: 'string', description: 'Memory content', required: true },
        layer: { type: 'string', description: 'Memory layer: working, episodic, semantic, metacognitive' },
        tags: { type: 'string', description: 'Comma-separated tags' },
      },
      execute: async (args) => {
        const memPath = path.join(rootPath, '.ultraia', 'agent-memory.json');
        try {
          let memories: MemoryEntry[] = [];
          if (fs.existsSync(memPath)) {
            memories = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
          }
          const entry: MemoryEntry = {
            id: `mem-${Date.now()}`,
            content: args.content as string,
            layer: (args.layer as MemoryEntry['layer']) || 'working',
            tags: typeof args.tags === 'string' ? args.tags.split(',').map((t: string) => t.trim()) : [],
            createdAt: Date.now(),
            importance: 0.5,
          };
          memories.push(entry);
          fs.mkdirSync(path.dirname(memPath), { recursive: true });
          fs.writeFileSync(memPath, JSON.stringify(memories, null, 2));
          return `Memory stored: ${entry.id} (${entry.layer})`;
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      },
    },
    {
      name: 'memory_list',
      description: 'List stored memories',
      category: 'memory',
      parameters: {
        layer: { type: 'string', description: 'Filter by layer' },
      },
      execute: async (args) => {
        const memPath = path.join(rootPath, '.ultraia', 'agent-memory.json');
        try {
          if (!fs.existsSync(memPath)) return 'No memories stored yet.';
          let memories: MemoryEntry[] = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
          if (args.layer) memories = memories.filter(m => m.layer === args.layer);
          if (memories.length === 0) return 'No memories found.';
          return memories.slice(-20).map(m =>
            `[${m.id}] (${m.layer}) ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`
          ).join('\n');
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      },
    },
    {
      name: 'open_file',
      description: 'Open a file in the VS Code editor',
      category: 'files',
      parameters: {
        path: { type: 'string', description: 'Relative file path', required: true },
        line: { type: 'number', description: 'Line number to jump to' },
      },
      execute: async (args) => {
        const filePath = path.join(rootPath, args.path as string);
        const uri = vscode.Uri.file(filePath);
        const pos = args.line ? new vscode.Position((args.line as number) - 1, 0) : undefined;
        const selection = pos ? new vscode.Range(pos, pos) : undefined;
        await vscode.window.showTextDocument(uri, { selection });
        return `Opened ${args.path}${args.line ? ` at line ${args.line}` : ''}`;
      },
    },
    {
      name: 'write_file',
      description: 'Write content to a file (creates or overwrites). Always explain what you are writing and why before calling this tool.',
      category: 'files',
      parameters: {
        path: { type: 'string', description: 'Relative file path', required: true },
        content: { type: 'string', description: 'Full file content to write', required: true },
      },
      execute: async (args) => {
        const filePath = path.join(rootPath, args.path as string);
        try {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(filePath, args.content as string, 'utf-8');
          const lines = (args.content as string).split('\n').length;
          return `Wrote ${lines} lines to ${args.path}`;
        } catch (err: any) {
          return `Error writing file: ${err.message}`;
        }
      },
    },
    {
      name: 'edit_file',
      description: 'Replace an exact string in a file with new content. The old_string must match exactly (including whitespace). Use read_file first to get the exact text.',
      category: 'files',
      parameters: {
        path: { type: 'string', description: 'Relative file path', required: true },
        old_string: { type: 'string', description: 'Exact text to find (must match exactly)', required: true },
        new_string: { type: 'string', description: 'Replacement text', required: true },
      },
      execute: async (args) => {
        const filePath = path.join(rootPath, args.path as string);
        try {
          if (!fs.existsSync(filePath)) return `Error: file not found: ${args.path}`;
          const content = fs.readFileSync(filePath, 'utf-8');
          const oldStr = args.old_string as string;
          const newStr = args.new_string as string;
          if (!content.includes(oldStr)) return `Error: old_string not found in ${args.path}. Use read_file to get the exact text.`;
          const updated = content.replace(oldStr, newStr);
          fs.writeFileSync(filePath, updated, 'utf-8');
          const count = content.split(oldStr).length - 1;
          return `Replaced ${count} occurrence(s) in ${args.path}`;
        } catch (err: any) {
          return `Error editing file: ${err.message}`;
        }
      },
    },
    {
      name: 'project_context',
      description: 'Load project context: AGENTS.md, STATE.md, LEARNINGS.md, loop-run-log.md, LEEME.md. Returns a summary of the project state.',
      category: 'project',
      parameters: {},
      execute: async () => {
        const files = ['AGENTS.md', 'STATE.md', 'learning/LEARNINGS.md', 'loop-run-log.md', 'LEEME.md', 'DOCS_TODO.md'];
        const results: string[] = [];
        for (const f of files) {
          const fp = path.join(rootPath, f);
          if (fs.existsSync(fp)) {
            try {
              const content = fs.readFileSync(fp, 'utf-8');
              const lines = content.split('\n');
              const preview = lines.slice(0, 50).join('\n');
              results.push(`=== ${f} (${lines.length} lines) ===\n${preview}${lines.length > 50 ? '\n...' : ''}`);
            } catch { /* skip */ }
          }
        }
        return results.length > 0 ? results.join('\n\n') : 'No project context files found.';
      },
    },
    {
      name: 'project_info',
      description: 'Get project metadata (package.json, test count, capabilities)',
      category: 'project',
      parameters: {},
      execute: async () => {
        try {
          const pkgPath = path.join(rootPath, 'package.json');
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          const corePkg = path.join(rootPath, 'packages', 'core', 'package.json');
          const core = fs.existsSync(corePkg) ? JSON.parse(fs.readFileSync(corePkg, 'utf-8')) : null;
          return JSON.stringify({
            name: pkg.name,
            version: pkg.version,
            workspaces: pkg.workspaces,
            coreDeps: core ? Object.keys(core.dependencies || {}).length : 0,
          }, null, 2);
        } catch (err: any) {
          return `Error: ${err.message}`;
        }
      },
    },
    {
      name: 'sandbox_execute',
      description: 'Execute agent-generated code in a Docker-safe sandbox (simulated if Docker absent)',
      category: 'sandbox',
      parameters: {
        lang: { type: 'string', description: 'python|javascript|typescript|bash', required: true },
        code: { type: 'string', description: 'Source code to execute', required: true },
        timeoutMs: { type: 'number', description: 'Execution timeout in ms (default 30000)' },
      },
      execute: async (args) => {
        const id = `sb-${Date.now()}`;
        const workDir = path.join(rootPath, '.ultraia', 'sandbox', id);
        fs.mkdirSync(workDir, { recursive: true });
        const lang = (args.lang as string) || 'python';
        const code = args.code as string || '';
        const timeout = (args.timeoutMs as number) || 30000;
        const ext = lang === 'python' ? 'py' : (lang === 'bash' ? 'sh' : 'js');
        const filePath = path.join(workDir, `script.${ext}`);
        fs.writeFileSync(filePath, code, 'utf-8');

        // Detect docker
        try {
          await execAsync('docker --version', { timeout: 5000 });
        } catch {
          // Docker absent -> simulate safe plan-only execution
          return `[sandbox simulated] docker not available on host. script saved to ${filePath}. Length ${code.length} chars.`;
        }

        // Map language to image and run with strict limits
        const image = lang === 'python' ? 'python:3.12-slim' : lang === 'bash' ? 'ubuntu:22.04' : 'node:20-slim';
        const containerCmd = lang === 'python' ? `python /work/${path.relative(rootPath, filePath).replace(/\\/g,'/')}` : (lang === 'bash' ? `bash /work/${path.relative(rootPath, filePath).replace(/\\/g,'/')}` : `node /work/${path.relative(rootPath, filePath).replace(/\\/g,'/')}`);
        const dockerCmd = `docker run --rm --cidfile=/tmp/${id}.cid --memory=512m --cpus=0.5 -v "${rootPath.replace(/\\/g,'/')}:/work" -w /work ${image} sh -c "${containerCmd}"`;

        try {
          const { stdout, stderr } = await execAsync(dockerCmd, { timeout, maxBuffer: 1024 * 1024 * 5 });
          return `STDOUT:\n${stdout}\nSTDERR:\n${stderr || ''}`;
        } catch (err: any) {
          return `Sandbox execution failed: ${err.message}\n${err.stdout || ''}\n${err.stderr || ''}`;
        }
      },
    },
    {
      name: 'request_human_approval',
      description: 'Create a human-approval request for a critical action (writes a pending approval file)',
      category: 'safety',
      parameters: {
        reason: { type: 'string', description: 'Why approval is needed', required: true },
        payload: { type: 'string', description: 'JSON payload describing the action' },
      },
      execute: async (args) => {
        const id = `approval-${Date.now()}`;
        const approvalsDir = path.join(rootPath, '.ultraia', 'approvals');
        fs.mkdirSync(approvalsDir, { recursive: true });
        const file = path.join(approvalsDir, `${id}.json`);
        const entry = { id, reason: args.reason, payload: args.payload ?? null, createdAt: Date.now(), status: 'pending' };
        fs.writeFileSync(file, JSON.stringify(entry, null, 2));
        return `Approval requested: ${id}. Review and approve by creating file ${file.replace(/\\/g,'/')} (set status:'approved') or use /api/orchestrator.`;
      },
    },
    {
      name: 'task_complete',
      description: 'Signal that the current task is fully complete. Use this when you have finished all steps and verified the result.',
      category: 'safety',
      parameters: {
        summary: { type: 'string', description: 'Brief summary of what was done', required: true },
      },
      execute: async (args) => {
        return `TASK COMPLETE: ${args.summary}`;
      },
    },
    {
      name: 'clone_website',
      description: 'Clone a website: fetch its HTML, extract design tokens (colors, fonts, sections, assets), and generate Next.js component code. Use when the user wants to clone, replicate, or reverse-engineer a website.',
      category: 'web',
      parameters: {
        url: { type: 'string', description: 'Target URL to clone', required: true },
        route: { type: 'string', description: 'Destination route (default: /)' },
      },
      execute: async (args) => {
        const url = args.url as string;
        const route = (args.route as string) || '/';
        try {
          // Step 1: Fetch the HTML
          const response = await fetch(url, {
            headers: { 'User-Agent': 'UltraIa-CloneBot/1.0' },
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) return `Error: HTTP ${response.status} fetching ${url}`;
          const html = await response.text();

          // Step 2: Extract design tokens and structure
          const colorRe = /#[0-9a-fA-F]{3,8}/g;
          const colors = [...new Set(html.match(colorRe) || [])];
          const fontRe = /fonts\.googleapis\.com\/css2\?family=([^&"']+)/g;
          const fonts: string[] = [];
          let fm;
          while ((fm = fontRe.exec(html)) !== null) {
            fonts.push(decodeURIComponent(fm[1]).split(':')[0].replace(/\+/g, ' '));
          }
          const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
          const images: string[] = [];
          let im;
          while ((im = imgRe.exec(html)) !== null) {
            let src = im[1];
            if (src.startsWith('/')) src = new URL(src, url).href;
            images.push(src);
          }
          const sectionRe = /<(header|main|footer|section|nav)[^>]*>([\s\S]*?)<\/\1>/gi;
          const sections: string[] = [];
          let sm;
          while ((sm = sectionRe.exec(html)) !== null) {
            sections.push(sm[1]);
          }
          const textRe = />([^<]{3,})</g;
          const texts: string[] = [];
          let tm;
          while ((tm = textRe.exec(html)) !== null) {
            const t = tm[1].trim();
            if (t && !t.startsWith('{') && !t.startsWith('//')) texts.push(t);
          }

          const siteKey = new URL(url).hostname.replace(/[^a-z0-9]/g, '-');

          return JSON.stringify({
            status: 'extracted',
            url,
            route,
            siteKey,
            tokens: { colors: colors.slice(0, 20), fonts },
            sections: sections.length,
            assets: { images: images.length },
            textBlocks: [...new Set(texts)].slice(0, 30),
            nextSteps: [
              'Review extracted tokens and sections above',
              'Use write_file to create components based on the extracted structure',
              'Create route file at the destination route',
              'Run diagnose typecheck to verify',
            ],
          }, null, 2);
        } catch (err: any) {
          return `Error cloning ${url}: ${err.message}`;
        }
      },
    },
    {
      name: 'browser_navigate',
      description: 'Navigate to a URL and capture title/snippet (Playwright required)',
      category: 'browser',
      parameters: {
        url: { type: 'string', description: 'Target URL', required: true },
        script: { type: 'string', description: 'Optional small script to run in page context' },
      },
      execute: async (args) => {
        try {
          // attempt to require playwright dynamically
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const playwright = require('playwright');
          const browser = await playwright.chromium.launch({ headless: true });
          const page = await browser.newPage();
          await page.goto(args.url as string, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const title = await page.title();
          let snippet = '';
          if (args.script) {
            snippet = await page.evaluate(`(function(){ ${args.script} })()`);
          } else {
            snippet = await page.$eval('body', (el: any) => el.innerText.substring(0, 200));
          }
          await browser.close();
          return JSON.stringify({ title, snippet });
        } catch (err: any) {
          return `Playwright not available or navigation failed: ${err.message}`;
        }
      },
    }
  ];

  tools.forEach(t => registry.register(t));
}

// ── LLM Client ───────────────────────────────────────────────────────────────

class LLMClient {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async chat(
    messages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }>,
    tools?: Array<{ name: string; description: string; parameters: Record<string, any> }> | Array<{ type: string; function: { name: string; description: string; parameters: any } }>,
  ): Promise<string> {
    const body: any = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: false,
    };

    if (tools && tools.length > 0) {
      // Detect format: if first tool has 'type' property, it's already OpenAI format
      const first = tools[0] as any;
      if (first.type && first.function) {
        body.tools = tools;
      } else {
        body.tools = (tools as Array<{ name: string; description: string; parameters: Record<string, any> }>).map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: {
              type: 'object',
              properties: Object.fromEntries(
                Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }])
              ),
              required: Object.entries(t.parameters)
                .filter(([, v]: [string, any]) => v.required)
                .map(([k]) => k),
            },
          },
        }));
      }
    }

    try {
      const response = await fetch(`${this.config.llmUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM API error ${response.status}: ${text}`);
      }

      const data = await response.json() as any;
      const choice = data.choices?.[0];
      if (!choice) throw new Error('No choices in LLM response');

      if (choice.message?.tool_calls) {
        return JSON.stringify({ tool_calls: choice.message.tool_calls });
      }

      return choice.message?.content || '';
    } catch (err: any) {
      return `[LLM Error: ${err.message}]`;
    }
  }

  updateConfig(config: Partial<AgentConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }
}

// ── Session Persistence ──────────────────────────────────────────────────────

function getSessionsPath(rootPath: string): string {
  return path.join(rootPath, '.ultraia', 'agent-sessions.json');
}

function loadSessions(rootPath: string): ChatSession[] {
  const sessionsPath = getSessionsPath(rootPath);
  try {
    if (fs.existsSync(sessionsPath)) {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

function saveSessions(rootPath: string, sessions: ChatSession[]): void {
  const sessionsPath = getSessionsPath(rootPath);
  fs.mkdirSync(path.dirname(sessionsPath), { recursive: true });
  fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
}

// ── Agent ────────────────────────────────────────────────────────────────────

export class UltraIaAgent {
  private session: ChatSession;
  private sessions: ChatSession[];
  private llm: LLMClient;
  private registry: ToolRegistry;
  private rootPath: string;
  private config: AgentConfig;
  private onMessageCallback?: (msg: AgentMessage) => void;
  private onSessionChangeCallback?: (sessions: ChatSession[]) => void;
  private runtimeUrl?: string;
  private sessionToken?: string;
  private runtimeAvailable = false;
  private conversationId?: string;

  constructor(rootPath: string, config?: Partial<AgentConfig>) {
    this.rootPath = rootPath;
    this.config = {
      llmUrl: config?.llmUrl || 'http://localhost:11434/v1',
      model: config?.model || 'qwen2.5-coder:1.5b-base',
      maxTokens: config?.maxTokens || 4096,
      temperature: config?.temperature || 0.7,
      systemPrompt: config?.systemPrompt || this.getDefaultSystemPrompt(),
      ...config,
    };
    this.runtimeUrl = config?.runtimeUrl;

    this.llm = new LLMClient(this.config);
    this.registry = new ToolRegistry();
    registerBuiltinTools(this.registry, rootPath);

    // Load persisted sessions
    this.sessions = loadSessions(rootPath);
    if (this.sessions.length > 0) {
      this.session = this.sessions[this.sessions.length - 1];
    } else {
      this.session = this.createSession();
      this.sessions.push(this.session);
      saveSessions(this.rootPath, this.sessions);
    }

    // Auto-connect to runtime if configured
    if (this.runtimeUrl && config?.email && config?.password) {
      this.login(config.email, config.password).catch(() => {});
    }
  }

  private createSession(title?: string): ChatSession {
    return {
      id: `session-${Date.now()}`,
      title: title || `Chat ${new Date().toLocaleTimeString()}`,
      messages: [],
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      model: this.config.model,
    };
  }

  private getDefaultSystemPrompt(): string {
    // Try to load project context files
    let projectContext = '';
    try {
      const ctxFiles = ['AGENTS.md', 'LEEME.md'];
      for (const f of ctxFiles) {
        const fp = path.join(this.rootPath, f);
        if (fs.existsSync(fp)) {
          const content = fs.readFileSync(fp, 'utf-8');
          // Take first 2000 chars to keep prompt manageable
          projectContext += `\n\n## ${f}\n${content.substring(0, 2000)}${content.length > 2000 ? '\n...' : ''}`;
        }
      }
    } catch { /* ignore */ }

    return `You are UltraIa Agent — an autonomous, world-class software development agent. You think, decide, plan, and ACT.

IDENTITY: You are a complete autonomous development house. You can read, write, edit, search, run commands, run tests, and commit code. You act like an elite senior engineer.

CORE RULES:
1. ALWAYS read files before editing them (read_file first, then edit_file or write_file)
2. When fixing bugs: read the file → understand the issue → apply the fix → run relevant tests
3. When building features: plan → implement → verify → commit
4. Be direct, technically precise, actionable. No marketing fluff.
5. Never guess file contents — always read first
6. When you edit a file, run the relevant tests after
7. Never run 'npm run build' while dev server is running (kill first with taskkill)
8. Use explicit git add (never git add .)
9. Commit messages: feat|fix|chore(scope): description
10. If a task requires multiple steps, do ALL steps in sequence until done

TOOL USAGE:
- read_file: Read any file in the project (always do this before editing)
- write_file: Create or overwrite a file (explain what you're writing first)
- edit_file: Find-and-replace exact text in a file (use read_file to get exact text)
- run_command: Execute any shell command (npm, git, python, etc.)
- grep: Search for patterns in code
- diagnose: Run a gate and extract structured errors (file, line, message) — USE THIS FIRST when fixing errors
- run_gates: Run typecheck/lint/test/build (reports all results even if some fail)
- git_status: Check git status
- project_context: Load project state (AGENTS.md, STATE.md, LEARNINGS.md)

ERROR FIXING WORKFLOW (when user says "there's an error" or "something is broken"):
1. Run diagnose typecheck → gives you EXACT file:line:error for each TypeScript error
2. Run diagnose lint → gives lint issues
3. Run diagnose test → gives failing test names and messages
4. For EACH error: read_file the file → edit_file the minimal fix → diagnose again to verify it's gone
5. Repeat until ALL gates pass, then task_complete

NEVER guess at fixes. The diagnose tool tells you EXACTLY what's wrong and where.
If diagnose says "L42: Type 'string' is not assignable to type 'number'" → read line 42 → fix it.

AUTONOMOUS LOOP:
When given a task, you MUST:
1. Understand the task (read relevant files, check project context)
2. Plan the steps (think step by step)
3. Execute each step using tools (read → edit → test → verify)
4. If a step fails, diagnose and retry
5. Report what you did and the result

You are NOT a chatbot. You are an autonomous agent that EXECUTES tasks completely.
When the user says "fix the bug in X", you: diagnose → read X → find the bug → fix it → diagnose again → done.
When the user says "add feature Y", you: plan → implement → test → done.
When the user says "there's an error, I don't know which one": diagnose ALL gates → fix each error → verify → done.

PROJECT: UltraIa — monorepo with apps/web (Next.js 15), packages/core (58+ tools), packages/runtime, apps/mobile.
${projectContext}

IMPORTANT: Execute tasks end-to-end. Do not ask for permission mid-task unless the action is destructive (force push, drop table, etc).`;
  }

  // ── Runtime Bridge ────────────────────────────────────────────────────────

  /** Login to UltraIa web app and get session token. */
  async login(email: string, password: string): Promise<boolean> {
    if (!this.runtimeUrl) return false;
    try {
      const res = await fetch(`${this.runtimeUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const data = await res.json() as any;
      this.sessionToken = data.token;
      this.runtimeAvailable = true;
      return true;
    } catch {
      this.runtimeAvailable = false;
      return false;
    }
  }

  /** Check if the UltraIa runtime is reachable. */
  async checkRuntime(): Promise<boolean> {
    if (!this.runtimeUrl) return false;
    try {
      const res = await fetch(`${this.runtimeUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.runtimeAvailable = res.ok;
      return res.ok;
    } catch {
      this.runtimeAvailable = false;
      return false;
    }
  }

  /** Check runtime and login if needed. Returns status string. */
  async connectRuntime(): Promise<string> {
    if (!this.runtimeUrl) return 'No runtimeUrl configured';
    const alive = await this.checkRuntime();
    if (!alive) return `Runtime offline at ${this.runtimeUrl}`;
    if (this.sessionToken) return `Connected to ${this.runtimeUrl}`;
    // Try login
    const email = this.config.email || 'admin@ultraia.local';
    const password = this.config.password || 'admin';
    const ok = await this.login(email, password);
    return ok ? `Connected to ${this.runtimeUrl}` : `Connected to runtime but login failed (${email})`;
  }

  /** Check if runtime is currently available. */
  isRuntimeAvailable(): boolean {
    return this.runtimeAvailable && !!this.sessionToken;
  }

  /** Send chat through UltraIa web app API (full 58+ tools). */
  private async chatViaBridge(userMessage: string): Promise<string> {
    if (!this.runtimeUrl || !this.sessionToken) throw new Error('No runtime');

    // Create conversation if needed
    if (!this.conversationId) {
      const convRes = await fetch(`${this.runtimeUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ultraia-session': this.sessionToken,
        },
        body: JSON.stringify({ title: userMessage.substring(0, 60) }),
      });
      if (convRes.ok) {
        const conv = await convRes.json() as any;
        this.conversationId = conv.id;
      } else {
        throw new Error(`Failed to create conversation: ${convRes.status}`);
      }
    }

    // Build messages array
    const messages = this.session.messages.slice(-20).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const res = await fetch(`${this.runtimeUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ultraia-session': this.sessionToken,
      },
      body: JSON.stringify({
        agentId: 'bp-admin-1',
        conversationId: this.conversationId,
        messages,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Runtime API error ${res.status}: ${text}`);
    }

    // Read streaming response
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE lines
      for (const line of chunk.split('\n')) {
        if (line.startsWith('0:')) {
          // Vercel AI SDK text delta
          try {
            fullText += JSON.parse(line.substring(2));
          } catch { fullText += line.substring(2); }
        }
      }
    }
    return fullText || '(empty response from runtime)';
  }

  /** Send a message and get a response. */
  async chat(userMessage: string): Promise<AgentMessage> {
    // Add user message
    this.session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      sessionId: this.session.id,
    });
    this.session.lastActivityAt = Date.now();

    // Auto-title: use first user message as session title
    if (this.session.messages.filter(m => m.role === 'user').length === 1) {
      this.session.title = userMessage.substring(0, 60) + (userMessage.length > 60 ? '...' : '');
    }

    // Try runtime bridge first (full 58+ tools, memory, skills)
    let finalContent = '';
    let usedBridge = false;
    if (this.runtimeAvailable && this.sessionToken) {
      try {
        finalContent = await this.chatViaBridge(userMessage);
        usedBridge = true;
      } catch (err: any) {
        // Bridge failed, fallback to direct LLM
        this.runtimeAvailable = false;
      }
    }

    // Tool calls only apply in direct LLM mode (bridge handles tools server-side)
    let toolCalls: ToolCall[] = [];
    let toolResults: ToolResult[] = [];

    if (!usedBridge) {
      // Direct LLM mode — ITERATIVE TOOL LOOP
      const messages: Array<{ role: string; content: string; tool_calls?: any[]; tool_call_id?: string }> = [
        { role: 'system', content: this.config.systemPrompt },
        ...this.session.messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
      ];
      const tools = this.registry.getAll();
      const toolDefs = tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }])
            ),
            required: Object.entries(t.parameters)
              .filter(([, v]: [string, any]) => v.required)
              .map(([k]) => k),
          },
        },
      }));

      const MAX_ROUNDS = 10; // safety limit
      let round = 0;

      while (round < MAX_ROUNDS) {
        round++;
        const response = await this.llm.chat(messages, toolDefs);

        // Check if response contains tool calls
        let parsed: any;
        try {
          parsed = JSON.parse(response);
        } catch {
          // Not JSON — plain text response, we're done
          finalContent = response;
          break;
        }

        if (!parsed.tool_calls || parsed.tool_calls.length === 0) {
          // No tool calls — plain text, done
          finalContent = response;
          break;
        }

        // Execute tool calls
        const assistantMsg: any = { role: 'assistant', content: '', tool_calls: parsed.tool_calls };
        messages.push(assistantMsg);

        for (const tc of parsed.tool_calls) {
          const toolCall: ToolCall = {
            id: tc.id || `tc-${Date.now()}`,
            name: tc.function?.name || tc.name,
            args: typeof tc.function?.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function?.arguments || {},
          };
          toolCalls.push(toolCall);

          const tool = this.registry.get(toolCall.name);
          if (tool) {
            try {
              const output = await tool.execute(toolCall.args);
              toolResults.push({ callId: toolCall.id, success: true, output });
              messages.push({ role: 'tool', content: output, tool_call_id: toolCall.id });
            } catch (err: any) {
              const errResult = `Error: ${err.message}`;
              toolResults.push({ callId: toolCall.id, success: false, output: '', error: err.message });
              messages.push({ role: 'tool', content: errResult, tool_call_id: toolCall.id });
            }
          } else {
            const errResult = `Unknown tool: ${toolCall.name}`;
            toolResults.push({ callId: toolCall.id, success: false, output: '', error: errResult });
            messages.push({ role: 'tool', content: errResult, tool_call_id: toolCall.id });
          }
        }

        // Continue loop — LLM will see tool results and decide next action
      }

      // If we exhausted rounds, the last assistant message is the final content
      if (!finalContent) {
        const lastAssistant = messages.filter(m => m.role === 'assistant' && m.content).pop();
        finalContent = lastAssistant?.content || '(max tool rounds reached)';
      }
    }

    // Create assistant message
    const assistantMsg: AgentMessage = {
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      sessionId: this.session.id,
    };

    this.session.messages.push(assistantMsg);
    this.session.lastActivityAt = Date.now();

    // Persist
    saveSessions(this.rootPath, this.sessions);
    this.onSessionChangeCallback?.(this.sessions);
    this.onMessageCallback?.(assistantMsg);

    return assistantMsg;
  }

  /** Create a new chat session. */
  newSession(): ChatSession {
    this.session = this.createSession();
    this.sessions.push(this.session);
    saveSessions(this.rootPath, this.sessions);
    this.onSessionChangeCallback?.(this.sessions);
    return this.session;
  }

  /** Switch to a different session. */
  switchSession(sessionId: string): boolean {
    const found = this.sessions.find(s => s.id === sessionId);
    if (found) {
      this.session = found;
      return true;
    }
    return false;
  }

  /** Delete a session. */
  deleteSession(sessionId: string): boolean {
    const idx = this.sessions.findIndex(s => s.id === sessionId);
    if (idx === -1) return false;
    this.sessions.splice(idx, 1);
    if (this.session.id === sessionId) {
      this.session = this.sessions[this.sessions.length - 1] || this.createSession();
      if (this.sessions.length === 0) this.sessions.push(this.session);
    }
    saveSessions(this.rootPath, this.sessions);
    this.onSessionChangeCallback?.(this.sessions);
    return true;
  }

  /** Get all sessions. */
  getSessions(): ChatSession[] {
    return [...this.sessions];
  }

  /** Register callback for new messages. */
  onMessage(callback: (msg: AgentMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /** Register callback for session changes. */
  onSessionChange(callback: (sessions: ChatSession[]) => void): void {
    this.onSessionChangeCallback = callback;
  }

  /** Get the current session. */
  getSession(): ChatSession {
    return { ...this.session };
  }

  /** Get the tool registry. */
  getToolRegistry(): ToolRegistry {
    return this.registry;
  }

  /** Get LLM config. */
  getConfig(): AgentConfig {
    return this.llm.getConfig();
  }

  /** Update LLM config. */
  updateConfig(config: Partial<AgentConfig>): void {
    this.llm.updateConfig(config);
  }

  /** Clear current session. */
  clearSession(): void {
    this.session.messages = [];
    this.session.lastActivityAt = Date.now();
    saveSessions(this.rootPath, this.sessions);
    this.onSessionChangeCallback?.(this.sessions);
  }

  /** Export session to JSON string. */
  exportSession(): string {
    return JSON.stringify(this.session, null, 2);
  }

  /** Import session from JSON string. */
  importSession(data: string): void {
    const imported = JSON.parse(data) as ChatSession;
    this.sessions.push(imported);
    this.session = imported;
    saveSessions(this.rootPath, this.sessions);
    this.onSessionChangeCallback?.(this.sessions);
  }

  /** Get memories from disk. */
  getMemories(layer?: string): MemoryEntry[] {
    const memPath = path.join(this.rootPath, '.ultraia', 'agent-memory.json');
    try {
      if (!fs.existsSync(memPath)) return [];
      let memories: MemoryEntry[] = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
      if (layer) memories = memories.filter(m => m.layer === layer);
      return memories;
    } catch {
      return [];
    }
  }

  /** Delete a memory. */
  deleteMemory(id: string): boolean {
    const memPath = path.join(this.rootPath, '.ultraia', 'agent-memory.json');
    try {
      if (!fs.existsSync(memPath)) return false;
      let memories: MemoryEntry[] = JSON.parse(fs.readFileSync(memPath, 'utf-8'));
      const before = memories.length;
      memories = memories.filter(m => m.id !== id);
      if (memories.length === before) return false;
      fs.writeFileSync(memPath, JSON.stringify(memories, null, 2));
      return true;
    } catch {
      return false;
    }
  }
}
