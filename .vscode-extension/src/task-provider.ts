/**
 * UltraIa Task Provider — TreeDataProvider for the Tasks view.
 *
 * Shows active tasks with their status (running, completed, failed).
 */

import * as vscode from 'vscode';

interface TaskItem {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
}

export class UltraIaTaskProvider implements vscode.TreeDataProvider<TaskItem>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<TaskItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private tasks: TaskItem[] = [];

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  addTask(task: TaskItem): void {
    this.tasks.push(task);
    this.refresh();
  }

  updateTask(id: string, status: TaskItem['status']): void {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      this.refresh();
    }
  }

  getTreeItem(element: TaskItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);

    switch (element.status) {
      case 'running':
        item.iconPath = new vscode.ThemeIcon('loading~spin');
        item.description = 'running';
        break;
      case 'completed':
        item.iconPath = new vscode.ThemeIcon('check');
        item.description = 'done';
        break;
      case 'failed':
        item.iconPath = new vscode.ThemeIcon('error');
        item.description = 'failed';
        break;
    }

    return item;
  }

  getChildren(element?: TaskItem): TaskItem[] {
    if (element) return [];
    return this.tasks;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
