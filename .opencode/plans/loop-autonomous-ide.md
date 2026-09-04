# Plan — UltraIa Autonomous IDE Agent (3 Fases)

## Contexto
El usuario quiere que UltraIa funcione como un agente autónomo en VS Code/Cursor: las decisiones del chat se materializan en código automáticamente. Ya existe el 80% de la infraestructura (EventBus, WebSocket, TaskManager, 8 agentes, PIVR loop, Cerebro). Faltan 3 piezas: trigger endpoint, chat-to-code bridge, y VS Code extension.

## FASE 1: Trigger Endpoint (1 paso)
**Objetivo**: Crear `POST /api/loop/trigger` que acepta una descripción de tarea y arranca un ciclo PIVR autónomo.

### Archivos a tocar
- `packages/core/src/tools/loop-trigger.ts` — dominio puro: `validateTriggerInput`, `buildTriggerTask`, `TriggerResult` type
- `apps/web/src/app/api/loop/trigger/route.ts` — endpoint REST (auth required, ADMIN only)
- `packages/core/src/tools/index.ts` — export + TOOL_DESCRIPTIONS
- `packages/core/src/ai/llm.ts` — capability `loop-trigger` → tool `loop_trigger`

### Spec
```
POST /api/loop/trigger
Body: { task: string, mode?: 'p-p'|'p-b'|'auto', agentId?: string }
Response: { taskId: string, status: 'queued'|'started', estimatedSeconds: number }

- Valida input (zod), crea task en TaskManager
- Si mode='auto': ejecuta PIVR completo (plan→implement→verify)
- Si mode='p-p': solo planifica
- Si mode='p-b': implementa un plan existente
- Emite eventos via EventBus: task.created, task.started, task.completed
-任何 connected WS client (VS Code extension) recibe updates en tiempo real
```

### NO-hacer
- No tocar el runtime API server (server.ts) — el endpoint vive en apps/web
- No ejectuar gates sin auth
- No auto-push ni auto-merge

### Verificación
- typecheck ✅ · lint ✅ · test scoped ✅ · build ✅

---

## FASE 2: Chat-to-Code Bridge (2 pasos)
**Objetivo**: Middleware que recibe mensajes de chat (de cualquier fuente) y los routea al agente correcto, que produce código y lo aplica como edits de archivo.

### Paso 2a: Bridge Core
**Archivos a tocar**
- `packages/core/src/tools/chat-bridge.ts` — dominio puro: `routeMessage`, `applyCodeEdits`, `BridgeResult`
- `apps/web/src/app/api/bridge/route.ts` — endpoint WebSocket que recibe mensajes y devuelve edits

### Spec
```
POST /api/bridge/message
Body: { message: string, source: 'vscode'|'discord'|'telegram'|'web', agentId?: string }
Response: { edits: Array<{file: string, action: 'create'|'update'|'delete', content?: string}>, 
            summary: string, gates: {typecheck: boolean, lint: boolean, test: boolean} }

Flow:
1. routeMessage() selecciona agente por contenido (o usa agentId explícito)
2. Agente genera respuesta con tools (file_edit, file_create, etc.)
3. applyCodeEdits() aplica cambios al filesystem
4. Ejecuta gates automáticamente
5. Si gates GREEN → commit; si RED → rollback + reporte
6. Retorna resultado estructurado
```

### Paso 2b: Event Integration
**Archivos a tocar**
- `packages/core/src/tools/chat-bridge.ts` — agregar `emitBridgeEvent()` que publica al EventBus
- `packages/runtime/src/api/runtime-handlers.ts` — agregar handler `bridge.message` al WS

### Verificación
- typecheck ✅ · lint ✅ · test scoped ✅ · build ✅
- Test e2e: enviar mensaje via API → recibir edits → gates verdes

---

## FASE 3: VS Code Extension (3 pasos)
**Objetivo**: Extension VS Code que conecta al WebSocket del runtime y provee panel lateral de chat + status bar.

### Paso 3a: Extension Scaffold
**Archivos a crear**
- `.vscode-extension/package.json` — manifest con contributes (commands, views, keybindings)
- `.vscode-extension/src/extension.ts` — activate/deactivate, registro de providers
- `.vscode-extension/tsconfig.json` — config para VS Code extension host
- `.vscode-extension/.vscodeignore` — excluir node_modules innecesarios

### Spec
```
Activation: onStartupFinished
Commands:
- ultraia.chat: abre panel lateral de chat
- ultraia.trigger: command palette → input task → POST /api/loop/trigger
- ultraia.status: muestra estado del runtime en status bar

Views:
- ultraia-chat: panel lateral con webview de chat
- ultraia-tasks: lista de tareas activas con progreso
```

### Paso 3b: WebSocket Client
**Archivos a crear**
- `.vscode-extension/src/ws-client.ts` — conecta a `ws://127.0.0.1:<port>/events?token=<hex>`
- `.vscode-extension/src/status-bar.ts` — actualiza item de status bar con eventos del runtime

### Spec
```
- Reconexión automática con backoff exponencial
- Filtra eventos: task.*, runtime.*, health.*
- Actualiza status bar: 🟢 running / 🟡 idle / 🔴 error
- Muestra notificaciones VS Code para task.completed y task.failed
```

### Paso 3c: Chat Panel
**Archivos a crear**
- `.vscode-extension/src/chat-panel.ts` — WebviewProvider para panel lateral
- `.vscode-extension/media/chat.html` — HTML del panel de chat
- `.vscode-extension/media/chat.js` — JS del panel (envía mensajes via postMessage)

### Spec
```
- Chat input que envía POST /api/bridge/message
- Muestra respuestas del agente con syntax highlighting
- Botón "Apply Edits" que aplica los cambios propuestos
- Botón "Run Gates" que ejecuta typecheck/lint/test/build
- Historial de conversaciones (persiste en workspaceState)
```

### Verificación
- typecheck ✅ · lint ✅ · test scoped ✅ · build ✅
- Instalar extension localmente → verificar que conecta al WS → enviar mensaje → recibir edits

---

## Orden de ejecución
1. FASE 1 (trigger endpoint) — 1 commit
2. FASE 2a (bridge core) — 1 commit
3. FASE 2b (event integration) — 1 commit
4. FASE 3a (extension scaffold) — 1 commit
5. FASE 3b (ws client) — 1 commit
6. FASE 3c (chat panel) — 1 commit

## Riesgos
- **VS Code extension API**: las extensiones VS Code usan APIs propias (vscode.*); necesitan compilación con webpack/esbuild
- **WebSocket en extension**: VS Code extensions no tienen WebSocket nativo; usar `ws` npm package o `fetch` con SSE
- **Seguridad**: el token del runtime se expone en la extension; store en VS Code secrets, nunca en settings plain-text
- **Compatibilidad**: probar en VS Code >= 1.85 y Cursor (basado en VS Code)
