/**
 * UltraIa WebSocket Client — connects to Local API runtime.
 * 
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Token authentication
 * - Event emission for connection state and messages
 * - Message queue for offline scenarios
 */

import * as vscode from 'vscode';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface WSClientOptions {
  url: string;
  token: string;
  outputChannel: vscode.LogOutputChannel;
}

type WSMessage = { topic: string; payload: unknown } | { type: string; [key: string]: unknown };

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private outputChannel: vscode.LogOutputChannel;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // ms
  private maxReconnectDelay = 30000; // 30s
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: WSMessage[] = [];
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(options: WSClientOptions) {
    super();
    this.url = options.url;
    this.token = options.token;
    this.outputChannel = options.outputChannel;
  }

  /**
   * Connect to the WebSocket server.
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    const wsUrl = `${this.url}/events${this.token ? `?token=${this.token}` : ''}`;
    this.outputChannel.appendLine(`[WS] Connecting to ${wsUrl}`);

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.on('open', () => {
          this.outputChannel.appendLine('[WS] Connection opened');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.emit('connected');
          this.flushQueue();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            this.emit('message', msg);
          } catch (err) {
            this.outputChannel.appendLine(`[WS] Parse error: ${err instanceof Error ? err.message : String(err)}`);
          }
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          this.outputChannel.appendLine(`[WS] Connection closed: ${code} ${reason.toString()}`);
          this.isConnecting = false;
          this.emit('disconnected', reason.toString());
          
          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (err: Error) => {
          this.outputChannel.appendLine(`[WS] Error: ${err.message}`);
          this.emit('error', err);
          
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(err);
          }
        });
      } catch (err) {
        this.isConnecting = false;
        reject(err);
      }
    });
  }

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.outputChannel.appendLine('[WS] Max reconnect attempts reached');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    this.outputChannel.appendLine(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Error will trigger another reconnect via 'error' event
      });
    }, delay);
  }

  /**
   * Flush queued messages.
   */
  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift()!;
      this.send(msg);
    }
  }

  /**
   * Send a message to the server.
   */
  send(msg: WSMessage): boolean {
    const data = JSON.stringify(msg);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    
    // Queue for later
    this.messageQueue.push(msg);
    return false;
  }

  /**
   * Send a bridge.message to the runtime.
   */
  sendBridgeMessage(message: string, source: string, agentId?: string, userId?: string): boolean {
    return this.send({
      type: 'bridge.message',
      message,
      source,
      agentId,
      userId
    });
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect gracefully.
   */
  disconnect(): void {
    this.shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }
}