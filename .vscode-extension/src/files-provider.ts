//! Files Tree Provider - Quick file navigator with agent context.

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'out', '.ultraia', 'dist']);
const KEY_FILES = [
  'package.json', 'tsconfig.json', 'AGENTS.md', 'STATE.md',
  'loop-run-log.md', 'loop-constraints.md', 'start.py', 'opencode.json',
];

export class FilesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
      // Root: show key files + workspace folders
      const items: vscode.TreeItem[] = [];

      // Key files
      for (const file of KEY_FILES) {
        const filePath = path.join(this.rootPath, file);
        if (fs.existsSync(filePath)) {
          const item = new vscode.TreeItem(file, vscode.TreeItemCollapsibleState.None);
          item.iconPath = new vscode.ThemeIcon('file');
          item.command = {
            command: 'vscode.open',
            title: 'Open',
            arguments: [vscode.Uri.file(filePath)],
          };
          item.description = 'project';
          items.push(item);
        }
      }

      // Workspace folders
      const workspaces = [
        { name: 'apps/web', desc: 'Next.js 15' },
        { name: 'packages/core', desc: '58+ tools' },
        { name: 'packages/runtime', desc: 'Local agent' },
        { name: 'apps/mobile', desc: 'React Native' },
        { name: '.vscode-extension', desc: 'This extension' },
      ];

      for (const ws of workspaces) {
        const wsPath = path.join(this.rootPath, ws.name);
        if (fs.existsSync(wsPath)) {
          const item = new vscode.TreeItem(ws.name, vscode.TreeItemCollapsibleState.Collapsed);
          item.iconPath = new vscode.ThemeIcon('folder');
          item.description = ws.desc;
          item.resourceUri = vscode.Uri.file(wsPath);
          items.push(item);
        }
      }

      // Learning directory
      const learningPath = path.join(this.rootPath, 'learning');
      if (fs.existsSync(learningPath)) {
        const item = new vscode.TreeItem('learning', vscode.TreeItemCollapsibleState.Collapsed);
        item.iconPath = new vscode.ThemeIcon('book');
        item.description = 'truth + learnings';
        item.resourceUri = vscode.Uri.file(learningPath);
        items.push(item);
      }

      return items;
    }

    // Children of a folder
    const dirPath = element.resourceUri?.fsPath;
    if (!dirPath || !fs.existsSync(dirPath)) return [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const items: vscode.TreeItem[] = [];

      // Sort: folders first, then files
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sorted) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.relative(this.rootPath, fullPath);

        if (entry.isDirectory()) {
          const item = new vscode.TreeItem(entry.name, vscode.TreeItemCollapsibleState.Collapsed);
          item.iconPath = new vscode.ThemeIcon('folder');
          item.resourceUri = vscode.Uri.file(fullPath);
          items.push(item);
        } else {
          const item = new vscode.TreeItem(entry.name, vscode.TreeItemCollapsibleState.None);
          item.iconPath = this.getFileIcon(entry.name);
          item.command = {
            command: 'vscode.open',
            title: 'Open',
            arguments: [vscode.Uri.file(fullPath)],
          };
          item.description = relPath;
          items.push(item);
        }
      }

      return items;
    } catch {
      return [];
    }
  }

  private getFileIcon(filename: string): vscode.ThemeIcon {
    const ext = path.extname(filename).toLowerCase();
    const iconMap: Record<string, string> = {
      '.ts': 'file-code',
      '.tsx': 'file-code',
      '.js': 'file-code',
      '.jsx': 'file-code',
      '.json': 'file-json',
      '.md': 'file-text',
      '.css': 'file-media',
      '.svg': 'file-media',
      '.png': 'file-media',
      '.jpg': 'file-media',
      '.prisma': 'database',
      '.sql': 'database',
      '.py': 'file-code',
      '.toml': 'file-code',
      '.yaml': 'file-code',
      '.yml': 'file-code',
    };
    return new vscode.ThemeIcon(iconMap[ext] || 'file');
  }
}
