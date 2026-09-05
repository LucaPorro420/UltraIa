//! Chat Webview Panel for UltraIa Agent
// Multi-session chat with history, skill injection, and file context.

import * as vscode from 'vscode';
import { UltraIaAgent, AgentMessage, ChatSession } from './agent';
import { baseCss, panelHeader, escHtml } from './webview-utils';

export class ChatPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia.chat';
  private view?: vscode.WebviewView;
  private agent: UltraIaAgent;
  private disposables: vscode.Disposable[] = [];

  constructor(agent: UltraIaAgent) {
    this.agent = agent;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true, localResourceRoots: [] };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'chat':
            await this.handleChat(message.text);
            break;
          case 'newSession':
            this.agent.newSession();
            this.refreshSessionList();
            this.postMessage({ type: 'sessionSwitched', session: this.agent.getSession() });
            break;
          case 'switchSession':
            this.agent.switchSession(message.sessionId);
            this.postMessage({ type: 'sessionSwitched', session: this.agent.getSession() });
            break;
          case 'deleteSession':
            this.agent.deleteSession(message.sessionId);
            this.refreshSessionList();
            break;
          case 'clear':
            this.agent.clearSession();
            this.postMessage({ type: 'cleared' });
            break;
          case 'config':
            this.agent.updateConfig(message.config);
            this.postMessage({ type: 'configUpdated', config: this.agent.getConfig() });
            break;
          case 'tools':
            this.postMessage({ type: 'toolsList', tools: this.agent.getToolRegistry().getSchema() });
            break;
          case 'status':
            this.sendStatus();
            break;
          case 'getContext':
            this.sendContext();
            break;
        }
      },
      undefined,
      this.disposables,
    );

    this.sendStatus();
    this.refreshSessionList();
  }

  private async handleChat(text: string): Promise<void> {
    this.postMessage({ type: 'thinking' });
    try {
      const response = await this.agent.chat(text);
      this.postMessage({
        type: 'response',
        content: response.content,
        toolCalls: response.toolCalls,
        toolResults: response.toolResults,
        timestamp: response.timestamp,
      });
    } catch (err: any) {
      this.postMessage({ type: 'error', content: err.message });
    }
  }

  private postMessage(msg: any): void {
    this.view?.webview.postMessage(msg);
  }

  private sendStatus(): void {
    this.postMessage({
      type: 'status',
      session: this.agent.getSession(),
      config: this.agent.getConfig(),
      tools: this.agent.getToolRegistry().getSchema().length,
      categories: this.agent.getToolRegistry().getCategories(),
    });
  }

  private refreshSessionList(): void {
    this.postMessage({
      type: 'sessions',
      sessions: this.agent.getSessions().map(s => ({
        id: s.id,
        title: s.title,
        messageCount: s.messages.length,
        createdAt: s.createdAt,
        model: s.model,
      })),
      currentId: this.agent.getSession().id,
    });
  }

  private sendContext(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const relPath = require('path').relative(
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
        editor.document.uri.fsPath
      );
      this.postMessage({
        type: 'context',
        file: relPath,
        selection: editor.document.getText(editor.selection) || undefined,
        lineCount: editor.document.lineCount,
      });
    }
  }

  public sendToChat(text: string): void {
    this.postMessage({ type: 'inject', text });
  }

  private getHtml(): string {
    const session = this.agent.getSession();
    const initialMessages = session.messages.map(m => this.renderMessageHtml(m)).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
${baseCss()}

/* Layout */
.sidebar {
  width: 200px;
  background: var(--panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}
.sidebar-header {
  padding: 8px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 6px;
}
.sidebar-header .title { font-size: 12px; font-weight: 600; color: var(--primary); flex: 1; }
.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}
.session-item {
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-dim);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.session-item:hover { background: var(--tool-bg); }
.session-item.active { background: var(--tool-bg); color: var(--text); border-left: 2px solid var(--primary); }
.session-item .session-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.session-item .session-count { font-size: 10px; color: var(--text-dim); }
.session-item .delete-btn { opacity: 0; color: var(--error); cursor: pointer; font-size: 11px; }
.session-item:hover .delete-btn { opacity: 1; }
.new-session-btn {
  margin: 4px;
  padding: 6px;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 4px;
  color: var(--text-dim);
  font-size: 12px;
  text-align: center;
  cursor: pointer;
}
.new-session-btn:hover { border-color: var(--primary); color: var(--primary); }

/* Main chat */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Messages */
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.msg {
  max-width: 95%;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user {
  align-self: flex-end;
  background: var(--primary);
  color: white;
  border-bottom-right-radius: 2px;
}
.msg.assistant {
  align-self: flex-start;
  background: var(--panel);
  border: 1px solid var(--border);
  border-bottom-left-radius: 2px;
}
.msg.system {
  align-self: center;
  background: transparent;
  color: var(--text-dim);
  font-size: 11px;
  font-style: italic;
}
.msg.error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--error);
}
.msg-time { font-size: 10px; color: var(--text-dim); margin-top: 4px; }
.tool-call {
  margin-top: 6px; padding: 6px 8px; background: var(--tool-bg);
  border: 1px solid var(--tool-border); border-radius: 4px;
  font-family: var(--vscode-font-code, 'Cascadia Code', monospace); font-size: 11px;
}
.tool-call .tool-name { color: var(--primary); font-weight: 600; }
.tool-call .tool-args { color: var(--text-dim); margin-top: 2px; white-space: pre-wrap; }
.tool-result {
  margin-top: 4px; padding: 6px 8px; background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 4px;
  font-family: var(--vscode-font-code, monospace); font-size: 11px;
  color: var(--text-dim); max-height: 150px; overflow-y: auto; white-space: pre-wrap;
}
.tool-result.error { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }

/* Thinking */
.thinking { display: none; align-self: flex-start; padding: 8px 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text-dim); }
.thinking.active { display: flex; align-items: center; gap: 6px; }
.thinking-dots span {
  width: 4px; height: 4px; border-radius: 50%; background: var(--primary);
  display: inline-block; animation: bounce 1.4s infinite ease-in-out;
}
.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

/* Input */
.input-area { padding: 8px 12px; border-top: 1px solid var(--border); display: flex; gap: 6px; flex-shrink: 0; }
.input-area textarea {
  flex: 1; background: var(--panel); border: 1px solid var(--border); border-radius: 6px;
  color: var(--text); font-family: inherit; font-size: 13px; padding: 8px 10px;
  resize: none; outline: none; min-height: 36px; max-height: 120px;
}
.input-area textarea:focus { border-color: var(--primary); }
.input-area textarea::placeholder { color: var(--text-dim); }
.send-btn { background: var(--primary); color: white; border: none; border-radius: 6px; padding: 8px 12px; font-size: 13px; font-weight: 600; flex-shrink: 0; }
.send-btn:hover { background: var(--primary-dim); }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.icon-btn { background: transparent; color: var(--text-dim); border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 11px; flex-shrink: 0; }
.icon-btn:hover { color: var(--error); border-color: var(--error); }

/* Quick actions bar */
.quick-bar { padding: 4px 12px; border-bottom: 1px solid var(--border); display: flex; gap: 4px; flex-shrink: 0; }
.quick-btn { padding: 3px 8px; background: var(--tool-bg); border: 1px solid var(--tool-border); border-radius: 4px; color: var(--text-dim); font-size: 11px; cursor: pointer; }
.quick-btn:hover { border-color: var(--primary); color: var(--primary); }
</style>
</head>
<body>
  <!-- Sidebar: Sessions -->
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="title">Chats</div>
      <button class="new-session-btn" onclick="post({type:'newSession'})" title="New chat">+ New</button>
    </div>
    <div class="sidebar-list" id="sessionList"></div>
  </div>

  <!-- Main Chat -->
  <div class="chat-main">
    <div class="quick-bar">
      <button class="quick-btn" onclick="injectContext()">[File Context]</button>
      <button class="quick-btn" onclick="post({type:'tools'})">[Tools]</button>
      <button class="quick-btn" onclick="post({type:'status'})">[Status]</button>
    </div>

    <div class="messages" id="messages">
      <div class="msg system">UltraIa Agent ready. Type a message to start.</div>
      ${initialMessages}
    </div>

    <div class="thinking" id="thinking">
      <div class="thinking-dots"><span></span><span></span><span></span></div>
      <span>Thinking...</span>
    </div>

    <div class="input-area">
      <textarea id="input" placeholder="Ask UltraIa anything... (Enter to send, Shift+Enter for newline)" rows="1"></textarea>
      <button class="send-btn" id="sendBtn" title="Send">Send</button>
      <button class="icon-btn" id="clearBtn" title="Clear session">Clear</button>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const messages = document.getElementById('messages');
    const input = document.getElementById('input');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');
    const thinking = document.getElementById('thinking');
    const sessionList = document.getElementById('sessionList');
    let isProcessing = false;
    let currentSessionId = '${session.id}';

    function post(msg) { vscode.postMessage(msg); }

    function sendMessage() {
      const text = input.value.trim();
      if (!text || isProcessing) return;
      addMessage('user', text);
      input.value = '';
      autoResize();
      setProcessing(true);
      post({ type: 'chat', text });
    }

    function addMessage(role, content, extra = {}) {
      const msg = document.createElement('div');
      msg.className = 'msg ' + role;
      let html = escapeHtml(content);
      if (extra.toolCalls) {
        for (const tc of extra.toolCalls) {
          html += '<div class="tool-call"><div class="tool-name">' + escapeHtml(tc.name) + '</div>';
          html += '<div class="tool-args">' + escapeHtml(JSON.stringify(tc.args, null, 2)) + '</div></div>';
        }
      }
      if (extra.toolResults) {
        for (const tr of extra.toolResults) {
          html += '<div class="tool-result' + (tr.success ? '' : ' error') + '">' + escapeHtml(tr.output || tr.error || '') + '</div>';
        }
      }
      const time = new Date(extra.timestamp || Date.now()).toLocaleTimeString();
      html += '<div class="msg-time">' + time + '</div>';
      msg.innerHTML = html;
      messages.appendChild(msg);
      scrollToBottom();
    }

    function escapeHtml(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
    function scrollToBottom() { messages.scrollTop = messages.scrollHeight; }
    function setProcessing(val) { isProcessing = val; thinking.classList.toggle('active', val); sendBtn.disabled = val; input.disabled = val; }
    function autoResize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; }
    function injectContext() { post({ type: 'getContext' }); }

    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    input.addEventListener('input', autoResize);
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', () => { messages.innerHTML = '<div class="msg system">Session cleared.</div>'; post({ type: 'clear' }); });

    function renderSessionList(sessions, currentId) {
      sessionList.innerHTML = '';
      currentSessionId = currentId;
      for (const s of sessions.reverse()) {
        const div = document.createElement('div');
        div.className = 'session-item' + (s.id === currentId ? ' active' : '');
        div.innerHTML = '<span class="session-title">' + escapeHtml(s.title) + '</span>'
          + '<span class="session-count">' + s.messageCount + '</span>'
          + '<span class="delete-btn" data-id="' + s.id + '">x</span>';
        div.addEventListener('click', e => {
          if (e.target.classList.contains('delete-btn')) {
            post({ type: 'deleteSession', sessionId: e.target.dataset.id });
          } else {
            post({ type: 'switchSession', sessionId: s.id });
          }
        });
        sessionList.appendChild(div);
      }
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.type) {
        case 'ready':
        case 'status':
          document.querySelector('.header-status') && (document.querySelector('.header-status').textContent = msg.tools + ' tools');
          break;
        case 'response':
          setProcessing(false);
          addMessage('assistant', msg.content, { toolCalls: msg.toolCalls, toolResults: msg.toolResults, timestamp: msg.timestamp });
          break;
        case 'thinking': setProcessing(true); break;
        case 'error': setProcessing(false); addMessage('error', msg.content); break;
        case 'cleared': messages.innerHTML = '<div class="msg system">Session cleared.</div>'; break;
        case 'inject': input.value = msg.text; sendMessage(); break;
        case 'sessions': renderSessionList(msg.sessions, msg.currentId); break;
        case 'sessionSwitched':
          currentSessionId = msg.session.id;
          messages.innerHTML = '<div class="msg system">Switched to: ' + escapeHtml(msg.session.title) + '</div>';
          for (const m of msg.session.messages) { addMessage(m.role, m.content, { toolCalls: m.toolCalls, toolResults: m.toolResults, timestamp: m.timestamp }); }
          break;
        case 'context':
          if (msg.file) {
            const ctx = '[File: ' + msg.file + (msg.selection ? ' | Selected: ' + msg.selection.substring(0, 200) : '') + ']';
            input.value = ctx + '\\n';
            input.focus();
          }
          break;
        case 'toolsList':
          const toolNames = msg.tools.map(t => t.name).join(', ');
          addMessage('system', 'Available tools (' + msg.tools.length + '): ' + toolNames);
          break;
      }
    });
  </script>
</body>
</html>`;
  }

  private renderMessageHtml(m: AgentMessage): string {
    let html = `<div class="msg ${m.role}">${escHtml(m.content)}`;
    if (m.toolCalls) {
      for (const tc of m.toolCalls) {
        html += `<div class="tool-call"><div class="tool-name">${escHtml(tc.name)}</div>`;
        html += `<div class="tool-args">${escHtml(JSON.stringify(tc.args, null, 2))}</div></div>`;
      }
    }
    if (m.toolResults) {
      for (const tr of m.toolResults) {
        html += `<div class="tool-result${tr.success ? '' : ' error'}">${escHtml(tr.output || tr.error || '')}</div>`;
      }
    }
    html += `<div class="msg-time">${new Date(m.timestamp).toLocaleTimeString()}</div></div>`;
    return html;
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
