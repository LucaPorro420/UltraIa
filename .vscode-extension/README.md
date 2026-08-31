# UltraIa Autonomous IDE — VS Code Extension

AI-powered autonomous coding agent for VS Code / Cursor.

## Features

- **Chat Panel** — sidebar chat that sends messages to the UltraIa bridge endpoint and receives code edits
- **Task Trigger** — command palette to trigger autonomous PIVR cycles
- **Status Bar** — real-time runtime status (🟢 running / 🟡 idle / 🔴 error)
- **WebSocket** — auto-reconnecting connection to the UltraIa runtime

## Setup

1. Have the UltraIa web server running (`npm run dev` or `python start.py`)
2. Open this directory in VS Code
3. Run `npm install` in `.vscode-extension/`
4. Press F5 to launch the Extension Development Host
5. The UltraIa icon appears in the activity bar

## Commands

| Command | Keybinding | Description |
|---------|-----------|-------------|
| `UltraIa: Open Chat Panel` | `Ctrl+Shift+U` | Opens the sidebar chat |
| `UltraIa: Trigger Task` | `Ctrl+Shift+T` | Input a task and trigger autonomous execution |
| `UltraIa: Show Runtime Status` | — | Shows connection status |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `ultraia.serverUrl` | `http://localhost:3000` | URL of the UltraIa web server |
| `ultraia.runtimeUrl` | `ws://127.0.0.1:4200/events` | WebSocket URL of the runtime |

## Architecture

```
VS Code Extension
├── extension.ts        — activate/deactivate, command registration
├── ws-client.ts        — WebSocket client with auto-reconnect
├── status-bar.ts       — status bar indicator
├── chat-panel.ts       — WebviewProvider for sidebar chat
└── task-provider.ts    — TreeDataProvider for task list
```

The extension communicates with the UltraIa backend via:
- `POST /api/loop/trigger` — trigger autonomous tasks
- `POST /api/bridge/message` — chat-to-code bridge
- `GET /api/loop/trigger` — status check (polling)
