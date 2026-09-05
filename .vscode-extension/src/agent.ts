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
      description: 'Run CI gates (typecheck, lint, test, build)',
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
          for (const [name, cmd] of Object.entries(gates)) {
            try {
              await execAsync(cmd, { cwd: rootPath, timeout: 300000 });
              results.push(`PASS ${name}`);
            } catch (err: any) {
              results.push(`FAIL ${name}\n${err.stderr || err.message}`);
            }
          }
          return results.join('\n\n');
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
  ];

  tools.forEach(t => registry.register(t));
}

// ── LLM Client ───────────────────────────────────────────────────────────────

class LLMClient {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async chat(messages: Array<{ role: string; content: string }>, tools?: Array<{ name: string; description: string; parameters: Record<string, any> }>): Promise<string> {
    const body: any = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: false,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: {
            type: 'object',
            properties: t.parameters,
            required: Object.entries(t.parameters)
              .filter(([, v]: [string, any]) => v.required)
              .map(([k]) => k),
          },
        },
      }));
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
      saveSessions(rootPath, this.sessions);
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
    return `You are UltraIa Agent — a world-class, multidisciplinary AI development company in one agent.

IDENTITY: You are a complete software development house. You think, decide, plan, and act like an elite team covering ALL domains: web, mobile, desktop, games, video, AI/ML, embedded, cloud, security.

CORE PRINCIPLES:
1. Ship production-ready code — never prototypes, never TODOs
2. Security first — OWASP Top 10, input validation, least privilege
3. Test everything — unit, integration, E2E before shipping
4. Clean architecture — SOLID, DRY, KISS, separation of concerns
5. Documentation — JSDoc/TSDoc, API specs, README
6. Performance — profile before optimizing
7. Accessibility — WCAG 2.1 AA minimum
8. Git hygiene — conventional commits, atomic PRs, CI/CD gates
9. User-centric — solve real problems
10. Ship fast, iterate faster — MVP first, then polish

CAPABILITIES:
- Read, search, navigate project files
- Run shell commands (npm, git, tests, build)
- Execute CI gates (typecheck, lint, test, build)
- Store and retrieve cognitive memories
- Open files in editor
- Use 58+ project tools (video, image, geometry, publishing, AI, cloud, etc.)

PROJECT: UltraIa — monorepo with apps/web (Next.js 15), packages/core (domain logic, 58+ tools), packages/runtime (local agent runtime), apps/mobile (React Native/Expo).

RULES:
- Be direct, technically precise, actionable
- Always verify with grep/read before editing
- Run relevant tests after changes
- Never build while dev server running (kill first)
- Use explicit git add (never git add .)
- Commit: feat|fix|chore(scope): description

When using tools, call them directly. When you need code, use read_file or grep.
Always explain what you're doing and why. Think step by step for complex tasks.`;
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

    // Build messages for LLM
    const messages = [
      { role: 'system', content: this.config.systemPrompt },
      ...this.session.messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
    ];

    // Get tools for LLM (full definitions with execute)
    const tools = this.registry.getAll();

    // Call LLM
    const response = await this.llm.chat(messages, tools);

    // Parse tool calls if present
    let toolCalls: ToolCall[] = [];
    let toolResults: ToolResult[] = [];
    let finalContent = response;

    try {
      const parsed = JSON.parse(response);
      if (parsed.tool_calls) {
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
            } catch (err: any) {
              toolResults.push({ callId: toolCall.id, success: false, output: '', error: err.message });
            }
          } else {
            toolResults.push({ callId: toolCall.id, success: false, output: '', error: `Unknown tool: ${toolCall.name}` });
          }
        }

        if (toolResults.length > 0) {
          const toolMessages = [
            ...messages,
            { role: 'assistant', content: '', tool_calls: parsed.tool_calls },
            ...toolResults.map(tr => ({
              role: 'tool',
              content: tr.success ? tr.output : `Error: ${tr.error}`,
              tool_call_id: tr.callId,
            })),
          ];
          finalContent = await this.llm.chat(toolMessages);
        }
      }
    } catch {
      // Not JSON, treat as plain text response
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
