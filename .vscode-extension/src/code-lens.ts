/**
 * UltraIa CodeLens Provider — inline code actions for AI-assisted development.
 *
 * Shows "Explain" and "Fix" code lenses above functions, classes, and methods
 * in TypeScript/JavaScript files. When clicked, sends the code to the runtime
 * and shows the response in a hover widget or output channel.
 *
 * Pattern: vscode.CodeLensProvider with symbol detection via document symbols.
 */

import * as vscode from 'vscode';
import { WebSocketClient } from './ws-client';

/** Regex patterns to detect function/class boundaries in TS/JS. */
const FUNCTION_PATTERN = /^\s*(export\s+)?(async\s+)?function\s+(\w+)/;
const CLASS_PATTERN = /^\s*(export\s+)?(abstract\s+)?class\s+(\w+)/;
const ARROW_PATTERN = /^\s*(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s*)?\(/;
const METHOD_PATTERN = /^\s*(public|private|protected|static|async)\s+(\w+)\s*\(/;

/** Supported languages for CodeLens. */
const SUPPORTED_LANGUAGES = [
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
];

interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'method' | 'arrow';
  range: vscode.Range;
}

/**
 * Detects function/class symbols in a document using line-by-line regex.
 * Falls back to this when documentSymbolProvider is unavailable.
 */
function detectSymbols(document: vscode.TextDocument): CodeSymbol[] {
  const symbols: CodeSymbol[] = [];

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const text = line.text;

    // Skip comments and empty lines
    if (text.trimStart().startsWith('//') || text.trimStart().startsWith('*') || text.trim() === '') {
      continue;
    }

    let match: RegExpMatchArray | null;

    if ((match = text.match(FUNCTION_PATTERN))) {
      const name = match[3] ?? 'anonymous';
      const endLine = findBlockEnd(document, i);
      symbols.push({
        name,
        kind: 'function',
        range: new vscode.Range(i, 0, endLine, document.lineAt(endLine).text.length),
      });
    } else if ((match = text.match(CLASS_PATTERN))) {
      const name = match[3] ?? 'AnonymousClass';
      const endLine = findBlockEnd(document, i);
      symbols.push({
        name,
        kind: 'class',
        range: new vscode.Range(i, 0, endLine, document.lineAt(endLine).text.length),
      });
    } else if ((match = text.match(ARROW_PATTERN))) {
      const name = match[3] ?? 'anonymous';
      const endLine = findBlockEnd(document, i);
      symbols.push({
        name,
        kind: 'arrow',
        range: new vscode.Range(i, 0, endLine, document.lineAt(endLine).text.length),
      });
    } else if ((match = text.match(METHOD_PATTERN))) {
      const name = match[2] ?? 'method';
      const endLine = findBlockEnd(document, i);
      symbols.push({
        name,
        kind: 'method',
        range: new vscode.Range(i, 0, endLine, document.lineAt(endLine).text.length),
      });
    }
  }

  return symbols;
}

/**
 * Find the end of a block by counting braces.
 */
function findBlockEnd(document: vscode.TextDocument, startLine: number): number {
  let depth = 0;
  let foundOpen = false;

  for (let i = startLine; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    for (const ch of line) {
      if (ch === '{') {
        depth++;
        foundOpen = true;
      } else if (ch === '}') {
        depth--;
        if (foundOpen && depth === 0) {
          return i;
        }
      }
    }
  }

  // Fallback: return start + 20 lines or end of document
  return Math.min(startLine + 20, document.lineCount - 1);
}

/**
 * CodeLens provider that shows "Explain" and "Fix" above code symbols.
 */
export class UltraIaCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private wsClient: WebSocketClient | null = null;
  private outputChannel: vscode.LogOutputChannel;

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Set the WebSocket client for sending messages to the runtime.
   */
  setWsClient(client: WebSocketClient | null): void {
    this.wsClient = client;
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    const symbols = detectSymbols(document);

    for (const symbol of symbols) {
      const title = `UltraIa: Explain ${symbol.name}`;
      const explainCommand: vscode.Command = {
        command: 'ultraia.explainSymbol',
        title,
        arguments: [document, symbol],
      };

      lenses.push(new vscode.CodeLens(symbol.range, explainCommand));

      // Add "Fix" lens for functions and methods (not classes)
      if (symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'arrow') {
        const fixTitle = `UltraIa: Fix ${symbol.name}`;
        const fixCommand: vscode.Command = {
          command: 'ultraia.fixSymbol',
          title: fixTitle,
          arguments: [document, symbol],
        };

        lenses.push(new vscode.CodeLens(symbol.range, fixCommand));
      }
    }

    return lenses;
  }
}

/**
 * Register CodeLens-related commands.
 */
export function registerCodeLensCommands(
  context: vscode.ExtensionContext,
  provider: UltraIaCodeLensProvider,
  outputChannel: vscode.LogOutputChannel,
): void {
  // Explain symbol command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'ultraia.explainSymbol',
      async (document: vscode.TextDocument, symbol: CodeSymbol) => {
        const code = document.getText(symbol.range);

        outputChannel.appendLine(`[CodeLens] Explain ${symbol.name} (${symbol.kind})`);
        outputChannel.appendLine(`[CodeLens] Code:\n${code}`);

        // Show in output channel for now
        const panel = vscode.window.createWebviewPanel(
          'ultraiaExplain',
          `UltraIa: ${symbol.name}`,
          vscode.ViewColumn.Beside,
          { enableScripts: false },
        );

        panel.webview.html = buildExplainHtml(symbol.name, code, 'Analyzing...');

        // Send to runtime if connected
        if (provider['wsClient']?.isConnected()) {
          provider['wsClient'].sendBridgeMessage(
            `Explain this ${symbol.kind}: ${symbol.name}\n\n\`\`\`\n${code}\n\`\`\``,
            'vscode',
          );
          outputChannel.appendLine(`[CodeLens] Sent to runtime for explanation`);
        } else {
          // Offline mode: show the code with a note
          panel.webview.html = buildExplainHtml(
            symbol.name,
            code,
            'Not connected to UltraIa runtime. Start the runtime and try again.',
          );
          outputChannel.appendLine(`[CodeLens] Runtime not connected — showing code only`);
        }
      },
    ),
  );

  // Fix symbol command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'ultraia.fixSymbol',
      async (document: vscode.TextDocument, symbol: CodeSymbol) => {
        const code = document.getText(symbol.range);

        outputChannel.appendLine(`[CodeLens] Fix ${symbol.name} (${symbol.kind})`);

        if (provider['wsClient']?.isConnected()) {
          provider['wsClient'].sendBridgeMessage(
            `Fix this ${symbol.kind}: ${symbol.name}\n\n\`\`\`\n${code}\n\`\`\`\n\nFind and fix any bugs, improve error handling, and suggest improvements.`,
            'vscode',
          );
          vscode.window.showInformationMessage(`UltraIa: Sent ${symbol.name} for review`);
        } else {
          vscode.window.showWarningMessage('UltraIa: Not connected to runtime. Start the runtime first.');
        }
      },
    ),
  );
}

/**
 * Build a simple HTML page for the explain panel.
 */
function buildExplainHtml(name: string, code: string, analysis: string): string {
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UltraIa: ${name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      background: #08080a;
      color: #e0e0e0;
      line-height: 1.6;
    }
    h1 { color: #8b5cf6; font-size: 18px; margin-bottom: 12px; }
    h2 { color: #a78bfa; font-size: 14px; margin-top: 16px; margin-bottom: 8px; }
    pre {
      background: #111115;
      border: 1px solid #1f1f2a;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }
    code { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
    .analysis {
      background: #111115;
      border-left: 3px solid #8b5cf6;
      padding: 12px;
      margin-top: 12px;
      border-radius: 0 6px 6px 0;
      white-space: pre-wrap;
    }
    .badge {
      display: inline-block;
      background: #8b5cf620;
      color: #8b5cf6;
      border: 1px solid #8b5cf640;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 12px;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <h1><span class="badge">AI</span> ${name}</h1>
  <h2>Code</h2>
  <pre><code>${escapedCode}</code></pre>
  <h2>Analysis</h2>
  <div class="analysis">${analysis}</div>
</body>
</html>`;
}
