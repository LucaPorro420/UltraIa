import React from 'react';
import { ChevronRight, FileText, Folder } from 'lucide-react';
import clsx from 'clsx';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileItem[];
  content?: string;
  language?: string;
  expanded?: boolean;
}

interface FileTreeProps {
  items: FileItem[];
  onToggle?: (path: string) => void;
  onOpen: (file: FileItem) => void;
}

const languageIcons: Record<string, string> = {
  python: '🐍',
  javascript: '📜',
  typescript: '🔷',
  html: '🌐',
  css: '🎨',
  markdown: '📝',
  json: '📋',
  sql: '🗄️',
  text: '📄',
};

function FileTreeItem({ item, onToggle, onOpen }: { item: FileItem; onToggle?: (path: string) => void; onOpen: (file: FileItem) => void }) {
  if (item.type === 'folder') {
    return (
      <li>
        <div className="flex items-center gap-1">
          {onToggle && (
            <button
              onClick={() => onToggle(item.path)}
              className="p-1 rounded hover:bg-cactus transition-colors"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${item.expanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          <span className="text-sm text-text-secondary flex-1">{item.name}</span>
        </div>
        {item.expanded && item.children && (
          <ul className="ml-4 mt-1 space-y-1 border-l border-border/50 pl-2">
            {item.children.map(child => (
              <FileTreeItem key={child.path} item={child} onToggle={onToggle} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        onClick={() => onOpen(item)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-cactus transition-colors text-left"
      >
        <span className="text-lg">{languageIcons[item.language || 'text']}</span>
        <span className="truncate flex-1">{item.name}</span>
      </button>
    </li>
  );
}

export function FileTree({ items, onToggle, onOpen }: FileTreeProps) {
  return (
    <ul className="space-y-1">
      {items.map(item => (
        <FileTreeItem key={item.path} item={item} onToggle={onToggle} onOpen={onOpen} />
      ))}
    </ul>
  );
}