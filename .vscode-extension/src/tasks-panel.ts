/**
 * UltraIa Tasks Panel — WebviewProvider for the side panel tasks view.
 * 
 * Shows active tasks with progress, status, and allows interaction.
 */

import * as vscode from 'vscode';
import * as path from 'path';

export interface TaskInfo {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  module?: string;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export class TasksPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia-tasks';
  
  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private _runtimeUrl: string;
  private _tasks: Map<string, TaskInfo> = new Map();
  private _context: vscode.ExtensionContext;
  private _wsClient: any;

  constructor(extensionUri: vscode.Uri, runtimeUrl: string, context: vscode.ExtensionContext, wsClient: any) {
    this._extensionUri = extensionUri;
    this._runtimeUrl = runtimeUrl;
    this._context = context;
    this._wsClient = wsClient;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          await this._refreshTasks();
          break;
        case 'cancelTask':
          await this._cancelTask(message.taskId);
          break;
        case 'retryTask':
          await this._retryTask(message.taskId);
          break;
        case 'ready':
          this._sendTasks();
          break;
      }
    });
  }

  /**
   * Update tasks from runtime events.
   */
  updateTask(task: TaskInfo): void {
    this._tasks.set(task.id, task);
    this._sendTasks();
  }

  /**
   * Remove a task.
   */
  removeTask(taskId: string): void {
    this._tasks.delete(taskId);
    this._sendTasks();
  }

  /**
   * Handle task events from runtime.
   */
  onTaskEvent(topic: string, payload: any): void {
    if (!payload || typeof payload !== 'object') return;
    
    const taskId = payload.id || payload.taskId;
    if (!taskId) return;

    const existing = this._tasks.get(taskId);
    const now = Date.now();
    
    let task: TaskInfo = existing || {
      id: taskId,
      type: payload.type || 'unknown',
      status: 'pending',
      progress: 0,
      priority: 0,
      createdAt: now,
      updatedAt: now
    };

    // Update based on event type
    switch (topic) {
      case 'task.created':
        task.status = 'pending';
        task.type = payload.type || task.type;
        task.module = payload.module;
        task.priority = payload.priority || 0;
        task.createdAt = now;
        break;
      case 'task.started':
        task.status = 'running';
        task.progress = 0;
        break;
      case 'task.progress':
        task.progress = Math.min(100, Math.max(0, payload.progress || 0));
        task.message = payload.message;
        break;
      case 'task.completed':
        task.status = 'completed';
        task.progress = 100;
        task.message = payload.message || 'Completed';
        break;
      case 'task.failed':
        task.status = 'failed';
        task.message = payload.error || 'Failed';
        break;
      case 'task.cancelled':
        task.status = 'cancelled';
        task.message = 'Cancelled';
        break;
    }
    
    task.updatedAt = now;
    this._tasks.set(taskId, task);
    this._sendTasks();
  }

  private async _refreshTasks(): Promise<void> {
    try {
      const response = await fetch(`${this._runtimeUrl}/api/tasks`, {
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json() as { tasks?: TaskInfo[] };
        if (data.tasks && Array.isArray(data.tasks)) {
          this._tasks.clear();
          for (const task of data.tasks) {
            this._tasks.set(task.id, task);
          }
          this._sendTasks();
        }
      }
    } catch {
      // Ignore - tasks will be populated via events
    }
  }

  private async _cancelTask(taskId: string): Promise<void> {
    if (!this._wsClient) return;
    this._wsClient.send({ type: 'task.cancel', taskId });
  }

  private async _retryTask(taskId: string): Promise<void> {
    if (!this._wsClient) return;
    this._wsClient.send({ type: 'task.retry', taskId });
  }

  private _sendTasks(): void {
    const tasks = Array.from(this._tasks.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    this._view?.webview.postMessage({ command: 'tasks', tasks });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'tasks.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'tasks.css')
    );
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>UltraIa Tasks</title>
</head>
<body>
  <div id="tasks-container">
    <div id="tasks-header">
      <h2>Tasks</h2>
      <button id="refresh-btn" title="Refresh">↻</button>
    </div>
    <div id="tasks-list"></div>
    <div id="empty-state" class="hidden">
      <p>No tasks yet</p>
      <p class="hint">Tasks will appear here when you trigger them from the Chat panel or VS Code commands.</p>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body></html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}