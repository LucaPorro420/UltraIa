/**
 * UltraIa Chat Panel — WebviewProvider for the side panel chat.
 * 
 * Features:
 * - Chat input that sends POST /api/bridge/message
 * - Syntax highlighted agent responses
 * - Apply Edits / Run Gates buttons
 * - Conversation history persisted in workspaceState
 */

import * as vscode from 'vscode';
import * as path from 'path';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  edits?: Array<{ file: string; action: string; content?: string }>;
  gates?: { typecheck: boolean; lint: boolean; test: boolean };
}

export class ChatPanel implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ultraia-chat';
  
  private _view?: vscode.WebviewView;
  private readonly _extensionUri: vscode.Uri;
  private _runtimeUrl: string;
  private _messages: ChatMessage[] = [];
  private _context: vscode.ExtensionContext;

  constructor(extensionUri: vscode.Uri, runtimeUrl: string, context?: vscode.ExtensionContext) {
    this._extensionUri = extensionUri;
    this._runtimeUrl = runtimeUrl;
    this._context = context!; // Will be set via resolveWebviewView
  }

  /**
   * Resolve the webview view.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    this._context = context as unknown as vscode.ExtensionContext;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Load persisted history
    this._loadHistory();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'sendMessage':
          await this._handleSendMessage(message.text);
          break;
        case 'applyEdits':
          await this._handleApplyEdits(message.edits);
          break;
        case 'runGates':
          await this._handleRunGates();
          break;
        case 'clearHistory':
          await this._clearHistory();
          break;
        case 'ready':
          this._sendHistory();
          break;
      }
    });
  }

  /**
   * Append a message to the chat.
   */
  appendMessage(message: ChatMessage): void {
    this._messages.push(message);
    this._persistHistory();
    this._sendToWebview({ command: 'appendMessage', message });
  }

  /**
   * Handle task events from runtime.
   */
  onTaskEvent(topic: string, payload: unknown): void {
    this.appendMessage({
      role: 'system',
      content: `📋 Task event: ${topic} — ${JSON.stringify(payload)}`,
      timestamp: Date.now()
    });
  }

  /**
   * Send a user message to the bridge API.
   */
  private async _handleSendMessage(text: string): Promise<void> {
    if (!text.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    this.appendMessage(userMsg);

    try {
      // Send to /api/bridge/message
      const response = await fetch(`${this._runtimeUrl}/api/bridge/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          source: 'vscode',
          userId: 'vscode-user'
        })
      });

      const result = await response.json() as { summary?: string; edits?: Array<{ file: string; action: string; content?: string }>; gates?: { typecheck: boolean; lint: boolean; test: boolean } };
      
      // Add assistant response
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.summary || 'Task completed',
        timestamp: Date.now(),
        edits: result.edits,
        gates: result.gates
      };
      this.appendMessage(assistantMsg);

    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'system',
        content: `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: Date.now()
      };
      this.appendMessage(errorMsg);
    }
  }

  /**
   * Apply suggested edits to files.
   */
  private async _handleApplyEdits(edits: Array<{ file: string; action: string; content?: string }>): Promise<void> {
    for (const edit of edits) {
      try {
        const fileUri = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', edit.file));
        
        if (edit.action === 'delete') {
          try {
            await vscode.workspace.fs.delete(fileUri);
          } catch {
            // File might not exist
          }
        } else {
          const content = edit.content || '';
          const encoder = new TextEncoder();
          await vscode.workspace.fs.writeFile(fileUri, encoder.encode(content));
        }
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to apply edit to ${edit.file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    vscode.window.showInformationMessage(`Applied ${edits.length} edit(s)`);
  }

  /**
   * Run project gates (typecheck, lint, test).
   */
  private async _handleRunGates(): Promise<void> {
    this.appendMessage({
      role: 'system',
      content: '🔍 Running gates...',
      timestamp: Date.now()
    });

    try {
      const terminal = vscode.window.createTerminal('UltraIa Gates');
      terminal.show();
      terminal.sendText('npm run typecheck && npm run lint && npm run test');
      
      this.appendMessage({
        role: 'system',
        content: '📋 Gates started in terminal. Check output for results.',
        timestamp: Date.now()
      });
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to run gates: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Load conversation history from workspaceState.
   */
  private _loadHistory(): void {
    if (!this._context) return;
    
    const history = this._context.workspaceState.get<ChatMessage[]>('ultraia.chatHistory', []);
    this._messages = history.slice(-100); // Keep last 100 messages
  }

  /**
   * Persist conversation history to workspaceState.
   */
  private _persistHistory(): void {
    if (!this._context) return;
    
    this._context.workspaceState.update('ultraia.chatHistory', this._messages.slice(-100));
  }

  /**
   * Send history to webview.
   */
  private _sendHistory(): void {
    this._sendToWebview({ command: 'history', messages: this._messages });
  }

  /**
   * Clear conversation history.
   */
  private async _clearHistory(): Promise<void> {
    this._messages = [];
    this._persistHistory();
    this._sendToWebview({ command: 'clear' });
  }

  /**
   * Send a message to the webview.
   */
  private _sendToWebview(message: unknown): void {
    this._view?.webview.postMessage(message);
  }

  /**
   * Generate the HTML for the webview.
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css')
    );
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="${styleUri}" rel="stylesheet">
  <title>UltraIa Chat</title>
</head>
<body>
  <div id="chat-container">
    <div id="messages"></div>
    <div id="input-area">
      <textarea id="message-input" placeholder="Describe a task for UltraIa..." rows="3"></textarea>
      <div id="actions">
        <button id="send-btn" title="Send (Ctrl+Enter)">Send</button>
        <button id="clear-btn" title="Clear History">Clear</button>
      </div>
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body></html>`;
  }

  /**
   * Generate a random nonce for CSP.
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}