/**
 * UltraIa VS Code Extension — Main entry point.
 * 
 * Provides:
 * - Activity bar with Chat and Tasks views
 * - Commands: chat, trigger, status, connect, disconnect
 * - Status bar item showing runtime connection state
 * - WebSocket connection to UltraIa Local API runtime
 */

import * as vscode from 'vscode';
import { WebSocketClient } from './ws-client';
import { StatusBar } from './status-bar';
import { ChatPanel } from './chat-panel';

export interface RuntimeConfig {
  wsUrl: string;
  token: string;
  runtimeUrl: string;
}

let wsClient: WebSocketClient | null = null;
let statusBar: StatusBar | null = null;
let chatPanel: ChatPanel | null = null;
let outputChannel: vscode.LogOutputChannel;
let config: RuntimeConfig;

/**
 * Get configuration from VS Code settings and secrets.
 */
async function getConfig(context: vscode.ExtensionContext): Promise<RuntimeConfig> {
  const cfg = vscode.workspace.getConfiguration('ultraia');
  const wsUrl = cfg.get<string>('wsUrl') || 'ws://127.0.0.1:8100';
  const runtimeUrl = cfg.get<string>('runtimeUrl') || 'http://localhost:3000';
  const token = await context.secrets.get('ultraia.token') || cfg.get<string>('token') || '';
  
  return { wsUrl, token, runtimeUrl };
}

/**
 * Update the 'ultraia.connected' context key for when clauses.
 */
function setConnectedContext(connected: boolean): void {
  vscode.commands.executeCommand('setContext', 'ultraia.connected', connected);
}

/**
 * Show notification if enabled in settings.
 */
function notify(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
  const cfg = vscode.workspace.getConfiguration('ultraia');
  if (!cfg.get<boolean>('showNotifications', true)) return;
  
  switch (type) {
    case 'info': vscode.window.showInformationMessage(message); break;
    case 'warning': vscode.window.showWarningMessage(message); break;
    case 'error': vscode.window.showErrorMessage(message); break;
  }
}

/**
 * Connect to the UltraIa runtime WebSocket.
 */
async function connect(context: vscode.ExtensionContext): Promise<void> {
  if (wsClient?.isConnected()) {
    notify('Already connected to UltraIa runtime', 'info');
    return;
  }

  config = await getConfig(context);
  outputChannel.appendLine(`[UltraIa] Connecting to ${config.wsUrl}...`);

  wsClient = new WebSocketClient({
      url: config.wsUrl,
      token: config.token,
      outputChannel
    });
  
  wsClient.on('connected', () => {
    outputChannel.appendLine('[UltraIa] Connected to runtime');
    setConnectedContext(true);
    statusBar?.setStatus('running');
    notify('Connected to UltraIa runtime', 'info');
  });

  wsClient.on('disconnected', (reason?: string) => {
    outputChannel.appendLine(`[UltraIa] Disconnected: ${reason || 'unknown'}`);
    setConnectedContext(false);
    statusBar?.setStatus('idle');
    notify(`Disconnected from UltraIa runtime: ${reason || 'unknown'}`, 'warning');
  });

  wsClient.on('error', (err: Error) => {
    outputChannel.appendLine(`[UltraIa] Error: ${err.message}`);
    statusBar?.setStatus('error');
    notify(`Runtime error: ${err.message}`, 'error');
  });

  wsClient.on('message', (data: unknown) => {
    handleRuntimeMessage(data);
  });

  try {
    await wsClient.connect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    outputChannel.appendLine(`[UltraIa] Connection failed: ${msg}`);
    setConnectedContext(false);
    statusBar?.setStatus('error');
    notify(`Failed to connect: ${msg}`, 'error');
    throw err;
  }
}

/**
 * Handle incoming messages from the runtime WebSocket.
 */
function handleRuntimeMessage(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  
  const msg = data as { topic?: string; payload?: unknown; type?: string };
  
  // Handle bridge events
  if (msg.topic?.startsWith('bridge.')) {
    const event = msg.payload as { type?: string; requestId?: string; timestamp?: number; payload?: Record<string, unknown> };
    handleBridgeEvent(event);
    return;
  }

  // Handle task events
  if (msg.topic?.startsWith('task.')) {
    chatPanel?.onTaskEvent(msg.topic, msg.payload);
    return;
  }

  // Handle runtime events
  if (msg.topic?.startsWith('runtime.')) {
    statusBar?.onRuntimeEvent(msg.topic, msg.payload);
    return;
  }

  // Handle health events
  if (msg.topic?.startsWith('health.')) {
    statusBar?.onHealthEvent(msg.topic, msg.payload);
    return;
  }
}

/**
 * Handle bridge-specific events from the runtime.
 */
function handleBridgeEvent(event: { type?: string; requestId?: string; timestamp?: number; payload?: Record<string, unknown> }): void {
  const { type, requestId, payload } = event;
  
  outputChannel.appendLine(`[UltraIa Bridge] ${type} (${requestId})`);
  
  switch (type) {
    case 'bridge.started':
      chatPanel?.appendMessage({
        role: 'system',
        content: `🚀 Starting bridge task: ${payload?.message || 'unknown'}`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.edits_generated':
      chatPanel?.appendMessage({
        role: 'system',
        content: `📝 Generated ${payload?.editsCount || 0} edit(s) for ${(payload?.files as string[])?.join(', ') || 'unknown files'}`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.edits_applied':
      chatPanel?.appendMessage({
        role: 'system',
        content: `✅ Applied edits to ${(payload?.filesChanged as string[])?.join(', ') || 'unknown files'}`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.gates_started':
      chatPanel?.appendMessage({
        role: 'system',
        content: `🔍 Running gates (typecheck, lint, test)...`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.gates_completed':
      chatPanel?.appendMessage({
        role: 'system',
        content: `📊 Gates result: ${JSON.stringify(payload?.gates)}`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.committed':
      chatPanel?.appendMessage({
        role: 'system',
        content: `📦 Committed: ${payload?.commitMsg || 'changes'}`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.completed':
      chatPanel?.appendMessage({
        role: 'system',
        content: `✨ Task completed: ${payload?.summary || 'done'}`,
        timestamp: Date.now()
      });
      break;
    case 'bridge.rolled_back':
      chatPanel?.appendMessage({
        role: 'system',
        content: `↩️ Rolled back: ${payload?.error || 'gates failed'}`,
        timestamp: Date.now()
      });
      vscode.window.showWarningMessage(`Bridge rolled back: ${payload?.error || 'gates failed'}`);
      break;
    case 'bridge.failed':
      chatPanel?.appendMessage({
        role: 'system',
        content: `❌ Task failed: ${payload?.error || 'unknown error'}`,
        timestamp: Date.now()
      });
      vscode.window.showErrorMessage(`Bridge task failed: ${payload?.error || 'unknown error'}`);
      break;
  }
}

/**
 * Disconnect from the runtime.
 */
async function disconnect(): Promise<void> {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
  setConnectedContext(false);
  statusBar?.setStatus('idle');
  notify('Disconnected from UltraIa runtime', 'info');
}

/**
 * Activate the extension.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('UltraIa', { log: true });
  outputChannel.appendLine('[UltraIa] Activating extension...');

  // Initialize status bar
  statusBar = new StatusBar();
  context.subscriptions.push(statusBar);

  // Initialize chat panel
  chatPanel = new ChatPanel(context.extensionUri, config?.runtimeUrl || 'http://localhost:3000', context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ultraia-chat', chatPanel)
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.chat', () => {
      vscode.commands.executeCommand('workbench.view.extension.ultraia-chat');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.trigger', async () => {
      if (!wsClient?.isConnected()) {
        vscode.window.showErrorMessage('Not connected to UltraIa runtime. Run "UltraIa: Connect to Runtime" first.');
        return;
      }
      
      const task = await vscode.window.showInputBox({
        prompt: 'Describe the task for UltraIa to execute',
        placeHolder: 'e.g., Add a dark mode toggle to the settings page',
        validateInput: (value) => value.length < 10 ? 'Task must be at least 10 characters' : null
      });
      
      if (!task) return;
      
      const mode = await vscode.window.showQuickPick(['auto', 'p-p', 'p-b', 'goal'], {
        placeHolder: 'Select execution mode',
        title: 'UltraIa Trigger Mode'
      });
      
      if (!mode) return;

      try {
        const response = await fetch(`${config.runtimeUrl}/api/loop/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, mode })
        });
        
        const result = await response.json() as { error?: string; taskId?: string; status?: string; summary?: string };
        if (result.error) {
          vscode.window.showErrorMessage(`Trigger failed: ${result.error}`);
        } else {
          vscode.window.showInformationMessage(`Task ${result.taskId} ${result.status}: ${result.summary}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Trigger error: ${err instanceof Error ? err.message : String(err)}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.status', () => {
      if (wsClient?.isConnected()) {
        vscode.window.showInformationMessage('UltraIa: Connected ✅');
      } else {
        vscode.window.showWarningMessage('UltraIa: Disconnected ❌');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.connect', async () => {
      try {
        await connect(context);
      } catch {
        // Error handled in connect()
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.disconnect', async () => {
      await disconnect();
    })
  );

  // Auto-connect on startup if enabled
  const cfg = vscode.workspace.getConfiguration('ultraia');
  if (cfg.get<boolean>('autoConnect', true)) {
    try {
      await connect(context);
    } catch {
      // Silent fail on auto-connect, user can manually connect
      outputChannel.appendLine('[UltraIa] Auto-connect failed, will retry on manual connect');
    }
  }

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('ultraia')) {
        outputChannel.appendLine('[UltraIa] Configuration changed');
        // Reconnect on next manual connect
      }
    })
  );

  outputChannel.appendLine('[UltraIa] Extension activated');
}

/**
 * Deactivate the extension.
 */
export function deactivate(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
  setConnectedContext(false);
  outputChannel?.appendLine('[UltraIa] Extension deactivated');
}