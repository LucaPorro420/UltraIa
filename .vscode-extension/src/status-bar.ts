/**
 * UltraIa Status Bar — shows runtime status in the VS Code status bar.
 *
 * Status indicators:
 * - 🟢 running (connected + task active)
 * - 🟡 idle (connected, no tasks)
 * - 🔴 error (disconnected or error)
 */

import * as vscode from 'vscode';
import type { UltraIaEvent } from './ws-client';

export class UltraIaStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private status: 'connected' | 'disconnected' | 'error' = 'disconnected';

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'ultraia.status';
    this.updateStatus('disconnected');
    this.item.show();
  }

  updateStatus(status: 'connected' | 'disconnected' | 'error'): void {
    this.status = status;

    switch (status) {
      case 'connected':
        this.item.text = '$(robot) UltraIa: 🟡 idle';
        this.item.tooltip = 'UltraIa runtime connected — idle';
        this.item.backgroundColor = undefined;
        break;
      case 'disconnected':
        this.item.text = '$(robot) UltraIa: 🔴 disconnected';
        this.item.tooltip = 'UltraIa runtime disconnected';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
      case 'error':
        this.item.text = '$(robot) UltraIa: 🔴 error';
        this.item.tooltip = 'UltraIa runtime error';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }

  updateFromEvent(event: UltraIaEvent): void {
    if (event.type.startsWith('task.')) {
      if (event.type === 'task.started' || event.type === 'task.created') {
        this.item.text = '$(robot) UltraIa: 🟢 running';
        this.item.tooltip = `UltraIa: task ${event.type}`;
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      } else if (event.type === 'task.completed') {
        this.item.text = '$(robot) UltraIa: 🟡 idle';
        this.item.tooltip = 'UltraIa: task completed';
        this.item.backgroundColor = undefined;
      } else if (event.type === 'task.failed') {
        this.item.text = '$(robot) UltraIa: 🔴 error';
        this.item.tooltip = 'UltraIa: task failed';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      }
    }
  }

  dispose(): void {
    this.item.dispose();
  }
}
