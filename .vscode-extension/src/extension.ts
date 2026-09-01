/**
 * UltraIa Autonomous IDE — VS Code Extension
 *
 * Activation: onStartupFinished
 * Provides:
 * - Chat panel (sidebar webview)
 * - Task trigger (command palette)
 * - Status bar indicator
 * - WebSocket connection for real-time events
 * - Task list auto-refresh
 */

import * as vscode from 'vscode';
import { UltraIaWSClient } from './ws-client';
import { UltraIaStatusBar } from './status-bar';
import { UltraIaChatPanel } from './chat-panel';
import { UltraIaTaskProvider } from './task-provider';

let wsClient: UltraIaWSClient | undefined;
let statusBar: UltraIaStatusBar | undefined;

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('UltraIa');
  outputChannel.appendLine('UltraIa extension activating...');

  // Status bar
  statusBar = new UltraIaStatusBar();
  context.subscriptions.push(statusBar);

  // Task list provider (with auto-refresh)
  const taskProvider = new UltraIaTaskProvider();
  vscode.window.registerTreeDataProvider('ultraia-tasks', taskProvider);
  context.subscriptions.push(taskProvider);

  // WebSocket client
  const config = vscode.workspace.getConfiguration('ultraia');
  const runtimeUrl = config.get<string>('runtimeUrl', 'ws://127.0.0.1:4200/events');

  wsClient = new UltraIaWSClient(runtimeUrl, {
    onEvent: (event) => {
      statusBar.updateFromEvent(event);

      // Auto-refresh task list from events
      if (event.type === 'task.created') {
        taskProvider.addTask({
          id: (event as any).taskId ?? `task-${Date.now()}`,
          label: (event as any).summary ?? 'New task',
          status: 'running',
        });
      } else if (event.type === 'task.started') {
        taskProvider.updateTask((event as any).taskId, 'running');
      } else if (event.type === 'task.completed') {
        taskProvider.updateTask((event as any).taskId, 'completed');
        vscode.window.showInformationMessage(`UltraIa: Task completed — ${(event as any).summary ?? 'done'}`);
      } else if (event.type === 'task.failed') {
        taskProvider.updateTask((event as any).taskId, 'failed');
        vscode.window.showWarningMessage(`UltraIa: Task failed — ${(event as any).error ?? 'unknown error'}`);
      }

      // Log to output channel
      outputChannel.appendLine(`[event] ${event.type}: ${JSON.stringify(event.payload ?? {})}`);
    },
    onStatusChange: (status) => {
      statusBar.updateStatus(status);
    },
  });

  context.subscriptions.push(wsClient);

  // Chat panel (with workspaceState for history persistence)
  const chatPanel = new UltraIaChatPanel(context.extensionUri, wsClient, context.workspaceState);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ultraia-chat', chatPanel),
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.chat', () => {
      vscode.commands.executeCommand('ultraia-chat.focus');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.trigger', async () => {
      const task = await vscode.window.showInputBox({
        prompt: 'Describe the task for UltraIa to execute',
        placeHolder: 'e.g., Add a dark mode toggle to settings',
        validateInput: (value) => value.length < 10 ? 'Task must be at least 10 characters' : null,
      });

      if (!task) return;

      const serverUrl = config.get<string>('serverUrl', 'http://localhost:3000');
      try {
        const response = await fetch(`${serverUrl}/api/loop/trigger`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, mode: 'auto', userId: 'vscode-user' }),
        });
        if (!response.ok) {
          vscode.window.showErrorMessage(`UltraIa: Trigger failed — HTTP ${response.status}`);
          return;
        }
        const result = await response.json() as { taskId?: string; status?: string; error?: string };
        if (result.error) {
          vscode.window.showErrorMessage(`UltraIa: ${result.error}`);
        } else {
          vscode.window.showInformationMessage(`UltraIa: Task ${result.taskId} — ${result.status}`);
        }
      } catch (err) {
        vscode.window.showErrorMessage(`UltraIa: Failed to trigger task — ${err}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ultraia.status', () => {
      const status = wsClient?.isConnected() ? 'Connected' : 'Disconnected';
      vscode.window.showInformationMessage(`UltraIa Runtime: ${status}`);
    }),
  );

  // Connect WebSocket
  wsClient.connect();

  outputChannel.appendLine('UltraIa extension activated.');
}

export function deactivate() {
  wsClient?.disconnect();
}
