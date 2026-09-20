import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Folder, Search, ChevronRight, ChevronDown, 
  Play, Terminal, Bug, GitBranch, Settings, X,
  Plus, Save, Copy, Download, Menu, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { FileTree } from '../components/FileTree';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileItem[];
  content?: string;
  language?: string;
  expanded?: boolean;
}

const mockFileTree: FileItem[] = [
  { name: 'src', type: 'folder', path: 'src', expanded: true, children: [
    { name: 'main.py', type: 'file', path: 'src/main.py', language: 'python', content: '# Main entry point\nprint("Hello, Plataforma Total!")\n' },
    { name: 'utils', type: 'folder', path: 'src/utils', children: [
      { name: 'helpers.py', type: 'file', path: 'src/utils/helpers.py', language: 'python', content: '# Helper functions\ndef format_name(name: str) -> str:\n    return name.title()\n' },
    ]},
    { name: 'models', type: 'folder', path: 'src/models', children: [
      { name: 'user.py', type: 'file', path: 'src/models/user.py', language: 'python', content: '# User model\nfrom dataclasses import dataclass\n\n@dataclass\nclass User:\n    id: str\n    name: str\n    email: str\n' },
    ]},
  ]},
  { name: 'tests', type: 'folder', path: 'tests', children: [
    { name: 'test_main.py', type: 'file', path: 'tests/test_main.py', language: 'python', content: '# Tests\nimport pytest\n\ndef test_hello():\n    assert True\n' },
  ]},
  { name: 'README.md', type: 'file', path: 'README.md', language: 'markdown', content: '# Mi Proyecto\n\nProyecto creado en Plataforma Total Unificada\n' },
  { name: 'requirements.txt', type: 'file', path: 'requirements.txt', language: 'text', content: 'fastapi==0.104.1\nuvicorn==0.24.0\nsqlalchemy==2.0.23\n' },
];

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

export function IDE() {
  const [fileTree, setFileTree] = useState<FileItem[]>(mockFileTree);
  const [openTabs, setOpenTabs] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<FileItem | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<string[]>(['$ Bienvenido al terminal de Plataforma Total', '$ Escribe un comando...']);
  const [terminalInput, setTerminalInput] = useState('');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [aiInput, setAiInput] = useState('');

  const openFile = (file: FileItem) => {
    if (!openTabs.find(t => t.path === file.path)) {
      setOpenTabs(prev => [...prev, file]);
    }
    setActiveTab(file);
    setEditorContent(file.content || '');
  };

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => prev.filter(t => t.path !== path));
    if (activeTab?.path === path) {
      const idx = openTabs.findIndex(t => t.path === path);
      const newTab = openTabs[idx + 1] || openTabs[idx - 1] || null;
      setActiveTab(newTab);
      setEditorContent(newTab?.content || '');
    }
  };

  const toggleFolder = (path: string) => {
    const updateTree = (items: FileItem[]): FileItem[] => 
      items.map(item => {
        if (item.path === path && item.type === 'folder') {
          return { ...item, expanded: !item.expanded };
        }
        if (item.children) {
          return { ...item, children: updateTree(item.children) };
        }
        return item;
      });
    setFileTree(updateTree(fileTree));
  };

  const handleTerminalSubmit = () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput;
    setTerminalHistory(prev => [...prev, `$ ${cmd}`, `Ejecutando: ${cmd}...`, '$ ']);
    setTerminalInput('');
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput;
    setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
    setAiInput('');
    // Simulate AI response
    setTimeout(() => {
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Entendido: "${msg}". Como tu asistente IA, puedo ayudarte a:\n- Explicar código seleccionado\n- Debuggear errores\n- Generar tests\n- Refactorizar\n- Crear ejercicios\n\n¿Qué necesitas?` 
      }]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-panel border-b border-border">
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Nuevo archivo"><Plus className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Abrir carpeta"><Folder className="w-4 h-4" /></button>
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Guardar"><Save className="w-4 h-4" /></button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Terminal" onClick={() => setTerminalOpen(!terminalOpen)}>
            <Terminal className={clsx('w-4 h-4', terminalOpen && 'text-primary')} />
          </button>
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="IA Assistant" onClick={() => setAiPanelOpen(!aiPanelOpen)}>
            <Bot className={clsx('w-4 h-4', aiPanelOpen && 'text-primary')} />
          </button>
          <button className="p-2 rounded-lg hover:bg-cactus transition-colors" title="Configuración"><Settings className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - File Explorer */}
        <div className="w-72 bg-panel border-r border-border flex flex-col">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">EXPLORER</h3>
            <button className="p-1 rounded hover:bg-cactus transition-colors" title="Nuevo archivo"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <FileTree items={fileTree} onToggle={toggleFolder} onOpen={openFile} />
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center h-8 bg-canvas border-b border-border px-2 overflow-x-auto">
            {openTabs.map((tab, i) => (
              <button
                key={tab.path}
                onClick={() => { setActiveTab(tab); setEditorContent(tab.content || ''); }}
                className={clsx(
                  'flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-sm transition-colors',
                  activeTab?.path === tab.path
                    ? 'bg-panel text-text-primary border-b-2 border-primary'
                    : 'text-text-muted hover:bg-cactus'
                )}
              >
                <span className={clsx('text-lg', languageIcons[tab.language || 'text'])} />
                <span className="truncate max-w-[150px]">{tab.name}</span>
                <button onClick={(e) => closeTab(tab.path, e)} className="ml-1 p-0.5 rounded hover:bg-cactus transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
            {openTabs.length === 0 && (
              <div className="px-4 text-text-muted text-sm">Ningún archivo abierto</div>
            )}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto p-4 bg-canvas relative">
            {activeTab ? (
              <Editor 
                content={editorContent}
                onChange={setEditorContent}
                language={activeTab.language || 'plaintext'}
                fileName={activeTab.name}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Bienvenido al IDE</p>
                  <p className="mt-2">Abre un archivo del explorador para empezar a editar</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - AI Assistant */}
        {aiPanelOpen && (
          <div className="w-96 bg-panel border-l border-border flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                IA Assistant
              </h3>
              <button onClick={() => setAiPanelOpen(false)} className="p-1 rounded hover:bg-cactus"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {aiMessages.map((msg, i) => (
                <div key={i} className={clsx('flex gap-2', msg.role === 'user' && 'justify-end')}>
                  <div className={clsx(
                    'max-w-[80%] rounded-2xl p-3',
                    msg.role === 'user' 
                      ? 'bg-primary text-white rounded-br-md' 
                      : 'bg-cactus text-text-primary rounded-bl-md'
                  )}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                  placeholder="Pregunta a la IA..."
                  className="flex-1 px-3 py-2 bg-cactus border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button onClick={handleAiSubmit} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Terminal */}
        {terminalOpen && (
          <div className="fixed bottom-0 left-0 right-0 h-64 bg-canvas border-t border-border z-40 flex flex-col animate-slide-up">
            <div className="flex items-center justify-between p-2 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Terminal
              </h3>
              <button onClick={() => setTerminalOpen(false)} className="p-1 rounded hover:bg-cactus"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-sm text-text-secondary bg-canvas">
              {terminalHistory.map((line, i) => (
                <div key={i} className={clsx('font-mono', line.startsWith('$') && 'text-text-primary')}>{line}</div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2 border-t border-border">
              <span className="text-text-primary font-mono">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTerminalSubmit()}
                className="flex-1 bg-transparent text-text-primary focus:outline-none font-mono text-sm"
                placeholder="Escribe un comando..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function Editor({ content, onChange, language, fileName }: { content: string; onChange: (c: string) => void; language: string; fileName: string }) {
  return (
    <div className="h-full bg-cactus rounded-lg overflow-hidden font-mono text-sm">
      <div className="flex items-center justify-between px-3 py-2 bg-cactus/50 border-b border-border">
        <span className="text-text-muted">{fileName}</span>
        <span className="px-2 py-0.5 text-xs bg-cactus border border-border rounded">{language}</span>
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-full bg-transparent text-text-primary focus:outline-none resize-none p-4"
        spellCheck={false}
        style={{ lineHeight: '1.6', tabSize: 2 }}
      />
    </div>
  );
}