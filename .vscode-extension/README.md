# UltraIa VS Code Extension

Connect to UltraIa runtime for autonomous coding, chat-to-code bridge, and real-time task monitoring.

## Features

- **Chat Panel**: Send tasks to UltraIa agents via `/api/bridge/message`
- **Autonomous Trigger**: Execute PIVR/goal pipelines via `/api/loop/trigger`
- **Real-time Status**: Status bar shows runtime connection state (🟢 running / 🟡 idle / 🔴 error)
- **Task Monitoring**: View active tasks with progress in the side panel
- **Conversation History**: Persisted across sessions in workspace state
- **Syntax Highlighting**: Agent responses with code blocks and edit previews

## Installation

### From Source (Development)

```bash
cd .vscode-extension
npm install
npm run compile
```

Then in VS Code:
1. Press `F5` to launch Extension Development Host
2. Run command `UltraIa: Connect to Runtime`

### Packaged (.vsix)

```bash
cd .vscode-extension
npx vsce package
code --install-extension ultraia-0.1.0.vsix
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `ultraia.runtimeUrl` | `http://localhost:3000` | Base URL of UltraIa web runtime |
| `ultraia.wsUrl` | `ws://127.0.0.1:8100` | WebSocket URL of Local API runtime |
| `ultraia.token` | `` | Session token (stored in VS Code secrets) |
| `ultraia.autoConnect` | `true` | Auto-connect on startup |
| `ultraia.showNotifications` | `true` | Show notifications for task events |

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `UltraIa: Open Chat Panel` | `Ctrl+Shift+U` | Open the chat side panel |
| `UltraIa: Trigger Autonomous Task` | `Ctrl+Shift+T` | Execute a task via trigger endpoint |
| `UltraIa: Show Runtime Status` | - | Show connection status |
| `UltraIa: Connect to Runtime` | - | Connect to WebSocket |
| `UltraIa: Disconnect from Runtime` | - | Disconnect |

## Usage

### Chat-to-Code Bridge

1. Open the Chat panel (`Ctrl+Shift+U`)
2. Type a task description (e.g., "Add a dark mode toggle to settings")
3. Press `Ctrl+Enter` or click Send
4. UltraIa will:
   - Route to the appropriate agent
   - Generate code edits
   - Run gates (typecheck, lint, test)
   - Commit if gates pass, rollback if they fail

### Autonomous Trigger

1. Run `UltraIa: Trigger Autonomous Task`
2. Enter task description
3. Select mode: `auto` (default), `p-p` (plan only), `p-b` (build), `goal` (content)
4. Task executes via PIVR loop or goal runner

## Architecture

```
┌─────────────┐     WebSocket      ┌──────────────────┐
│ VS Code Ext │◄──────────────────►│ UltraIa Runtime  │
│             │   bridge.message   │ (Local API)      │
│ - Chat      │   task.* events    │                  │
│ - Tasks     │   health.* events  │ - EventBus       │
│ - Status    │   runtime.* events │ - TaskManager    │
└─────────────┘                    └──────────────────┘
        │
        │ HTTP POST /api/bridge/message
        ▼
┌──────────────────┐
│ UltraIa Web API  │
│ - chatStream     │
│ - executeBridge  │
└──────────────────┘
```

## Events

The extension listens to these WebSocket topics:

- `bridge.*` — Bridge pipeline events (started, edits_generated, committed, rolled_back, etc.)
- `task.*` — Task lifecycle events
- `runtime.*` — Runtime state changes
- `health.*` — Health check results
- `module.*`, `memory.*`, `api.*` — Other runtime events

## Security

- Token stored in VS Code Secret Storage (not plaintext settings)
- WebSocket connection to localhost only by default
- CSP enforced on webview (no inline scripts without nonce)

## Development

```bash
# Watch mode
npm run watch

# Lint
npm run lint

# Run tests
npm test
```

## Requirements

- VS Code 1.85+
- UltraIa runtime running (web + Local API)
- Node.js 20+ for development