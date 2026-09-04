//! WebSocket endpoint for real-time sync between UltraIa apps.
// Provides pub/sub for orchestration events, learning updates, and
// cross-app state synchronization.
//
// Protocol:
//   Client → Server: { type: 'subscribe', topics: ['learning', 'orchestration', 'metrics'] }
//   Server → Client: { type: 'event', topic: string, payload: unknown }
//   Server → Client: { type: 'connected', appId: string, apps: ConnectedApp[] }

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'node:http';
import { getOrchestrator } from '@ultraia/core';

interface WSClient {
  ws: WebSocket;
  appId: string;
  topics: Set<string>;
}

const clients = new Map<string, WSClient>();

/** Handle new WebSocket connection. */
export function handleConnection(ws: WebSocket, req: IncomingMessage): void {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const appId = url.searchParams.get('appId') || `client-${Date.now()}`;
  const token = url.searchParams.get('token');

  // Simple token validation (in production, use proper auth)
  if (!token) {
    ws.close(4001, 'Token required');
    return;
  }

  const client: WSClient = { ws, appId, topics: new Set(['all']) };
  clients.set(appId, client);

  // Register app in orchestrator
  const orchestrator = getOrchestrator();
  orchestrator.registerApp({
    type: 'web',
    id: appId,
    status: 'connected',
    lastSeen: Date.now(),
    version: '1.0.0',
    capabilities: ['sync', 'learning', 'metrics'],
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    appId,
    apps: orchestrator.getConnectedApps(),
  }));

  // Handle messages
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMessage(client, msg);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    clients.delete(appId);
    orchestrator.updateAppStatus(appId, 'disconnected');
    broadcast({ type: 'app_disconnected', appId }, 'all');
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(heartbeat);
    }
  }, 30000);

  ws.on('close', () => clearInterval(heartbeat));
}

/** Handle incoming messages from clients. */
function handleMessage(client: WSClient, msg: Record<string, unknown>): void {
  const { type } = msg;

  switch (type) {
    case 'subscribe': {
      const topics = msg.topics as string[] || [];
      topics.forEach(t => client.topics.add(t));
      client.ws.send(JSON.stringify({ type: 'subscribed', topics: Array.from(client.topics) }));
      break;
    }

    case 'unsubscribe': {
      const topics = msg.topics as string[] || [];
      topics.forEach(t => client.topics.delete(t));
      client.ws.send(JSON.stringify({ type: 'unsubscribed', topics: Array.from(client.topics) }));
      break;
    }

    case 'learning_event': {
      const orchestrator = getOrchestrator();
      orchestrator.trackLearning({
        id: `learn-${Date.now()}`,
        app: (msg.app as 'web' | 'mobile' | 'vscode' | 'runtime') || 'web',
        timestamp: Date.now(),
        category: (msg.category as 'improvement' | 'bug' | 'feature' | 'insight' | 'error') || 'insight',
        description: (msg.description as string) || '',
        source: msg.source as string | undefined,
        impact: (msg.impact as 'low' | 'medium' | 'high') || 'medium',
        verified: false,
      });
      broadcast({ type: 'learning_update', ...msg }, 'learning');
      break;
    }

    case 'metric': {
      const orchestrator = getOrchestrator();
      orchestrator.recordMetric({
        name: (msg.name as string) || 'unknown',
        value: (msg.value as number) || 0,
        unit: (msg.unit as string) || '',
        app: (msg.app as 'web' | 'mobile' | 'vscode' | 'runtime') || 'web',
        timestamp: Date.now(),
      });
      broadcast({ type: 'metric_update', ...msg }, 'metrics');
      break;
    }

    case 'ping': {
      client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    }

    default:
      client.ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${type}` }));
  }
}

/** Broadcast message to all clients subscribed to a topic. */
function broadcast(message: Record<string, unknown>, topic: string): void {
  const payload = JSON.stringify(message);
  for (const [, client] of Array.from(clients.entries())) {
    if (client.ws.readyState === WebSocket.OPEN && client.topics.has(topic)) {
      client.ws.send(payload);
    }
  }
}

/** Broadcast to all clients regardless of topic. */
function broadcastAll(message: Record<string, unknown>): void {
  const payload = JSON.stringify(message);
  for (const [, client] of Array.from(clients.entries())) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

/** Get connected clients count. */
export function getConnectedCount(): number {
  return clients.size;
}

/** Get connected client IDs. */
export function getConnectedClients(): string[] {
  return Array.from(clients.keys());
}
