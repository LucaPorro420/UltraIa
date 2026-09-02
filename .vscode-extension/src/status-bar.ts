/**
 * UltraIa Status Bar — shows runtime connection state in VS Code status bar.
 * 
 * States:
 * - 🟢 running: Connected, runtime healthy
 * - 🟡 idle: Disconnected or connecting
 * - 🔴 error: Connection error or runtime unhealthy
 */

import * as vscode from 'vscode';

export class StatusBar {
  private item: vscode.StatusBarItem;
  private state: 'running' | 'idle' | 'error' = 'idle';
  private lastEvent: string = '';

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'ultraia.status';
    this.item.tooltip = 'UltraIa Runtime Status — Click for details';
    this.updateDisplay();
    this.item.show();
  }

  /**
   * Set the connection state.
   */
  setStatus(state: 'running' | 'idle' | 'error'): void {
    this.state = state;
    this.updateDisplay();
  }

  /**
   * Get current state.
   */
  getState(): 'running' | 'idle' | 'error' {
    return this.state;
  }

  /**
   * Handle runtime events.
   */
  onRuntimeEvent(topic: string, payload: unknown): void {
    this.lastEvent = topic;
    
    if (topic === 'runtime.started' || topic === 'runtime.healthy') {
      this.setStatus('running');
    } else if (topic === 'runtime.stopping' || topic === 'runtime.stopped') {
      this.setStatus('idle');
    } else if (topic === 'runtime.error') {
      this.setStatus('error');
    }
  }

  /**
   * Handle health events.
   */
  onHealthEvent(topic: string, payload: unknown): void {
    this.lastEvent = topic;
    
    if (topic === 'health.healthy') {
      this.setStatus('running');
    } else if (topic === 'health.degraded') {
      this.setStatus('idle');
    } else if (topic === 'health.unhealthy') {
      this.setStatus('error');
    }
  }

  /**
   * Update the status bar display.
   */
  private updateDisplay(): void {
    const icons = {
      running: '$(pass) UltraIa',
      idle: '$(circle-outline) UltraIa',
      error: '$(error) UltraIa'
    };

    const colors = {
      running: 'statusBarItem.prominentBackground',
      idle: undefined,
      error: 'statusBarItem.errorBackground'
    };

    this.item.text = icons[this.state];
    this.item.backgroundColor = colors[this.state] ? new vscode.ThemeColor(colors[this.state]!) : undefined;
    this.item.tooltip = `UltraIa: ${this.state.charAt(0).toUpperCase() + this.state.slice(1)}${this.lastEvent ? ` (${this.lastEvent})` : ''}`;
  }

  /**
   * Dispose the status bar item.
   */
  dispose(): void {
    this.item.dispose();
  }
}