/**
 * UltraIa Autonomous IDE — VS Code Extension
 *
 * Activation: onStartupFinished
 * Provides:
 * - Chat panel (sidebar webview)
 * - Task trigger (command palette)
 * - Status bar indicator
 * - WebSocket connection for real-time events
 */

import * as vscode from 'vscode';
import { UltraIaWSClient } from './ws-client';
import { UltraIaStatusBar } from './status-bar';
import { UltraIaChatPanel } from './chat-panel';
import { UltraIaTaskProvider } from './task-provider';

let wsClient: UltraIaWSClient | undefined;
let statusBar: UltraIaStatusBar | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('UltraIa extension activating...');

  // Status bar
  statusBar = new UltraIaStatusBar();
  context.subscriptions.push(statusBar);

  // WebSocket client
  const config = vscode.workspace.getConfiguration('ultraia');
  const runtimeUrl = config.get<string>('runtimeUrl', 'ws://127.0.0.1:4200/events');

  wsClient = new UltraIaWSClient(runtimeUrl, {
    onEvent: (event) => {
      statusBar.updateFromEvent(event);

      // Show notification for completed/failed tasks
      if (event.type === 'task.completed') {
        vscode.window.showInformationMessage(`UltraIa: Task completed — ${(event as any).summary ?? 'done'}`);
      } else if (event.type === 'task.failed') {
        vscode.window.showWarningMessage(`UltraIa: Task failed — ${(event as any).error ?? 'unknown error'}`);
      }
    },
    onStatusChange: (status) => {
      statusBar.updateStatus(status);
    },
  });

  context.subscriptions.push(wsClient);

  // Chat panel
  const chatPanel = new UltraIaChatPanel(context.extensionUri, wsClient);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ultraia-chat', chatPanel),
  );

  // Task list provider
  const taskProvider = new UltraIaTaskProvider();
  vscode.window.registerTreeDataProvider('ultraia-tasks', taskProvider);
  context.subscriptions.push(taskProvider);

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
        const result = await response.json();
        vscode.window.showInformationMessage(`UltraIa: Task ${result.taskId} — ${result.status}`);
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

  console.log('UltraIa extension activated.');
}

export function deactivate() {
  wsClient?.disconnect();
}
