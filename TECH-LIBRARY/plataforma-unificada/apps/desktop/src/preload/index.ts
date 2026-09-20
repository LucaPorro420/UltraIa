/**
 * Preload Script for Electron
 * 
 * Securely exposes IPC APIs to the renderer process
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// ============================================================================
// Type Definitions
// ============================================================================

interface IPCChannel {
  // Database
  'db:query': (sql: string, params?: any[]) => Promise<any>;
  'db:transaction': (queries: Array<{ sql: string; params: any[] }>) => Promise<any>;
  
  // Learning
  'learning:getCourses': () => Promise<any[]>;
  'learning:getCourse': (id: string) => Promise<any>;
  'learning:getLessons': (courseId: string) => Promise<any[]>;
  'learning:getProgress': (userId: string, courseId: string) => Promise<any>;
  'learning:markLessonComplete': (userId: string, courseId: string, lessonId: string) => Promise<any>;
  'learning:saveQuizResult': (userId: string, courseId: string, lessonId: string, quizId: string, score: number, total: number, passed: boolean, answers: any) => Promise<any>;
  'learning:issueCertificate': (userId: string, courseId: string, studentName: string, metadata: any) => Promise<any>;
  
  // Gateway
  'gateway:chat': (request: any) => Promise<any>;
  'gateway:chatStream': (request: any) => Promise<any>;
  'gateway:getModels': () => Promise<any>;
  
  // Agents
  'agents:orchestrate': (request: string, userId: string) => Promise<any>;
  'agents:execute': (agentType: string, task: string, input: any) => Promise<any>;
  
  // File System
  'fs:readFile': (filePath: string) => Promise<string>;
  'fs:writeFile': (filePath: string, content: string) => Promise<any>;
  'fs:listDir': (dirPath: string) => Promise<any>;
  'fs:mkdir': (dirPath: string) => Promise<any>;
  
  // Shell
  'shell:openExternal': (url: string) => Promise<any>;
  'shell:openPath': (path: string) => Promise<any>;
  'shell:showItemInFolder': (path: string) => Promise<any>;
  
  // Dialogs
  'dialog:showOpen': (options: any) => Promise<any>;
  'dialog:showSave': (options: any) => Promise<any>;
  'dialog:showMessageBox': (options: any) => Promise<any>;
  
  // Notifications
  'notification:show': (title: string, body: string) => Promise<any>;
  
  // App
  'app:getVersion': () => Promise<string>;
  'app:getPath': (name: string) => Promise<string>;
  'app:isDev': () => Promise<boolean>;
  'app:restart': () => Promise<void>;
  
  // Window
  'window:minimize': () => Promise<void>;
  'window:maximize': () => Promise<void>;
  'window:unmaximize': () => Promise<void>;
  'window:isMaximized': () => Promise<boolean>;
  'window:close': () => Promise<void>;
  
  // System
  'system:getInfo': () => Promise<any>;
  
  // Events from main
  'gateway:streamChunk': (chunk: any) => void;
  'update:available': () => void;
  'update:downloaded': () => void;
}

// ============================================================================
// Secure IPC Wrapper
// ============================================================================

function createIPCHandler<TC extends keyof IPCChannel>(channel: TC) {
  return (...args: Parameters<IPCChannel[TC]>) => 
    ipcRenderer.invoke(channel, ...args) as ReturnType<IPCChannel[TC]>;
}

function createEventListener<TC extends keyof IPCChannel>(channel: TC) {
  return (callback: (...args: Parameters<IPCChannel[TC]>) => void) => {
    const listener = (_event: IpcRendererEvent, ...args: Parameters<IPCChannel[TC]>) => callback(...args);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.off(channel, listener);
  };
}

// ============================================================================
// Exposed API
// ============================================================================

const electronAPI = {
  // Database
  db: {
    query: createIPCHandler('db:query'),
    transaction: createIPCHandler('db:transaction'),
  },
  
  // Learning
  learning: {
    getCourses: createIPCHandler('learning:getCourses'),
    getCourse: createIPCHandler('learning:getCourse'),
    getLessons: createIPCHandler('learning:getLessons'),
    getProgress: createIPCHandler('learning:getProgress'),
    markLessonComplete: createIPCHandler('learning:markLessonComplete'),
    saveQuizResult: createIPCHandler('learning:saveQuizResult'),
    issueCertificate: createIPCHandler('learning:issueCertificate'),
    onStreamChunk: createEventListener('gateway:streamChunk'),
  },
  
  // Gateway
  gateway: {
    chat: createIPCHandler('gateway:chat'),
    chatStream: createIPCHandler('gateway:chatStream'),
    getModels: createIPCHandler('gateway:getModels'),
    onStreamChunk: createEventListener('gateway:streamChunk'),
  },
  
  // Agents
  agents: {
    orchestrate: createIPCHandler('agents:orchestrate'),
    execute: createIPCHandler('agents:execute'),
  },
  
  // File System
  fs: {
    readFile: createIPCHandler('fs:readFile'),
    writeFile: createIPCHandler('fs:writeFile'),
    listDir: createIPCHandler('fs:listDir'),
    mkdir: createIPCHandler('fs:mkdir'),
  },
  
  // Shell
  shell: {
    openExternal: createIPCHandler('shell:openExternal'),
    openPath: createIPCHandler('shell:openPath'),
    showItemInFolder: createIPCHandler('shell:showItemInFolder'),
  },
  
  // Dialogs
  dialog: {
    showOpen: createIPCHandler('dialog:showOpen'),
    showSave: createIPCHandler('dialog:showSave'),
    showMessageBox: createIPCHandler('dialog:showMessageBox'),
  },
  
  // Notifications
  notification: {
    show: createIPCHandler('notification:show'),
  },
  
  // App
  app: {
    getVersion: createIPCHandler('app:getVersion'),
    getPath: createIPCHandler('app:getPath'),
    isDev: createIPCHandler('app:isDev'),
    restart: createIPCHandler('app:restart'),
  },
  
  // Window
  window: {
    minimize: createIPCHandler('window:minimize'),
    maximize: createIPCHandler('window:maximize'),
    unmaximize: createIPCHandler('window:unmaximize'),
    isMaximized: createIPCHandler('window:isMaximized'),
    close: createIPCHandler('window:close'),
  },
  
  // System
  system: {
    getInfo: createIPCHandler('system:getInfo'),
  },
  
  // Events
  on: {
    updateAvailable: createEventListener('update:available'),
    updateDownloaded: createEventListener('update:downloaded'),
    streamChunk: createEventListener('gateway:streamChunk'),
  },
};

// ============================================================================
// Expose to Renderer
// ============================================================================

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}