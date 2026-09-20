/**
 * Electron Main Process for Plataforma Total Unificada
 * 
 * Handles: window management, IPC, database, auto-updates, system tray
 */

import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray, nativeImage, Notification } from 'electron';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Database from 'better-sqlite3';
import { LearningDatabase } from '@plataforma-unificada/learning';
import { getConfig } from '@plataforma-unificada/core';
import { createLogger } from '@plataforma-unificada/core';

const logger = createLogger('Desktop-Main');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const config = getConfig();

// ============================================================================
// Database Setup
// ============================================================================

const userDataPath = app.getPath('userData');
const dbPath = join(userDataPath, 'plataforma.db');
const learningDbPath = join(userDataPath, 'learning.db');

logger.info('App paths', { userDataPath, dbPath, learningDbPath });

// Initialize databases
const mainDb = new Database(dbPath);
mainDb.pragma('journal_mode = WAL');

LearningDatabase.getInstance(learningDbPath);

// ============================================================================
// Window Management
// ============================================================================

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createMainWindow(): BrowserWindow {
  const preloadPath = join(__dirname, '../preload/index.js');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    icon: join(__dirname, '../../public/icon.png'),
  });

  // Load URL
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools({ mode: 'detach' });
  });

  // Handle window close - minimize to tray instead of quit
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

function createTray(): void {
  const iconPath = join(__dirname, '../../public/icon.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar Plataforma Total',
      click: () => {
        mainWindow?.show();
        if (process.platform === 'darwin') app.dock.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Pomodoro: Iniciar',
      click: () => mainWindow?.webContents.send('pomodoro:toggle'),
    },
    {
      label: 'Chat IA Rápido',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('chat:focus');
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  
  tray.setToolTip('Plataforma Total Unificada');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    mainWindow?.show();
    if (process.platform === 'darwin') app.dock.show();
  });
}

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  
  // Set app user model ID for Windows notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.plataforma.unificada');
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit on macOS when all windows closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('quit', () => {
  mainDb.close();
  LearningDatabase.getInstance().close();
});

// ============================================================================
// IPC Handlers
// ============================================================================

// Database operations
ipcMain.handle('db:query', async (_, sql: string, params: any[] = []) => {
  try {
    const stmt = mainDb.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    } else {
      const result = stmt.run(...params);
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  } catch (error) {
    logger.error('DB query error', { sql, error });
    throw error;
  }
});

ipcMain.handle('db:transaction', async (_, queries: Array<{ sql: string; params: any[] }>) => {
  const transaction = mainDb.transaction(() => {
    for (const { sql, params } of queries) {
      mainDb.prepare(sql).run(...params);
    }
  });
  try {
    transaction();
    return { success: true };
  } catch (error) {
    logger.error('Transaction error', { error });
    throw error;
  }
});

// Learning database operations
ipcMain.handle('learning:getCourses', () => {
  return LearningDatabase.getInstance().getAllCourses();
});

ipcMain.handle('learning:getCourse', (_, id: string) => {
  return LearningDatabase.getInstance().getCourse(id);
});

ipcMain.handle('learning:getLessons', (_, courseId: string) => {
  return LearningDatabase.getInstance().getLessonsByCourse(courseId);
});

ipcMain.handle('learning:getProgress', (_, userId: string, courseId: string) => {
  return LearningDatabase.getInstance().getProgress(userId, courseId);
});

ipcMain.handle('learning:markLessonComplete', (_, userId: string, courseId: string, lessonId: string) => {
  LearningDatabase.getInstance().markLessonComplete(userId, courseId, lessonId);
  return { success: true };
});

ipcMain.handle('learning:saveQuizResult', (_, userId: string, courseId: string, lessonId: string, quizId: string, score: number, total: number, passed: boolean, answers: any) => {
  LearningDatabase.getInstance().saveQuizResult(userId, courseId, lessonId, quizId, score, total, passed, answers);
  return { success: true };
});

ipcMain.handle('learning:issueCertificate', (_, userId: string, courseId: string, studentName: string, metadata: any) => {
  return LearningDatabase.getInstance().issueCertificate(userId, courseId, studentName, metadata);
});

// AI Gateway
ipcMain.handle('gateway:chat', async (_, request: any) => {
  const { getGatewayClient } = await import('@plataforma-unificada/gateway');
  const gateway = getGatewayClient();
  return gateway.chat(request);
});

ipcMain.handle('gateway:chatStream', async (_, request: any) => {
  const { getGatewayClient } = await import('@plataforma-unificada/gateway');
  const gateway = getGatewayClient();
  
  // For streaming, we send chunks via event
  for await (const chunk of gateway.chatStream(request)) {
    mainWindow?.webContents.send('gateway:streamChunk', chunk);
  }
  return { done: true };
});

ipcMain.handle('gateway:getModels', async () => {
  const { getGatewayClient } = await import('@plataforma-unificada/gateway');
  const gateway = getGatewayClient();
  return gateway.getModels();
});

// Agent Orchestration
ipcMain.handle('agents:orchestrate', async (_, request: string, userId: string) => {
  const { OrchestrationEngine } = await import('@plataforma-unificada/agents');
  const engine = new OrchestrationEngine();
  return engine.processRequest(request, userId);
});

ipcMain.handle('agents:execute', async (_, agentType: string, task: string, input: any) => {
  const { createAgent } = await import('@plataforma-unificada/agents');
  const agent = createAgent(agentType as any);
  return agent.execute({ id: 'ipc-task', type: task, input, status: 'pending' });
});

// File system operations
ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  const fs = await import('fs/promises');
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  const fs = await import('fs/promises');
  await fs.writeFile(filePath, content, 'utf-8');
  return { success: true };
});

ipcMain.handle('fs:listDir', async (_, dirPath: string) => {
  const fs = await import('fs/promises');
  return fs.readdir(dirPath, { withFileTypes: true });
});

ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
  const fs = await import('fs/promises');
  await fs.mkdir(dirPath, { recursive: true });
  return { success: true };
});

// Shell operations
ipcMain.handle('shell:openExternal', async (_, url: string) => {
  return shell.openExternal(url);
});

ipcMain.handle('shell:openPath', async (_, path: string) => {
  return shell.openPath(path);
});

ipcMain.handle('shell:showItemInFolder', async (_, path: string) => {
  shell.showItemInFolder(path);
  return { success: true };
});

// Dialogs
ipcMain.handle('dialog:showOpen', async (_, options: any) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result;
});

ipcMain.handle('dialog:showSave', async (_, options: any) => {
  const result = await dialog.showSaveDialog(mainWindow!, options);
  return result;
});

ipcMain.handle('dialog:showMessageBox', async (_, options: any) => {
  const result = await dialog.showMessageBox(mainWindow!, options);
  return result;
});

// Notifications
ipcMain.handle('notification:show', (_, title: string, body: string) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
  return { success: true };
});

// App info
ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPath', (_, name: string) => app.getPath(name as any));
ipcMain.handle('app:isDev', () => isDev);
ipcMain.handle('app:restart', () => app.relaunch({ args: process.argv.slice(1).concat(['--restart']) }), app.exit(0));

// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => mainWindow?.maximize());
ipcMain.handle('window:unmaximize', () => mainWindow?.unmaximize());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
ipcMain.handle('window:close', () => mainWindow?.close());

// System info
ipcMain.handle('system:getInfo', () => ({
  platform: process.platform,
  arch: process.arch,
  version: process.version,
  cpus: require('os').cpus().length,
  memory: Math.round(require('os').totalmem() / 1024 / 1024 / 1024 * 100) / 100,
}));

// ============================================================================
// Auto-updater (placeholder for electron-updater)
// ============================================================================

// import { autoUpdater } from 'electron-updater';
// 
// autoUpdater.checkForUpdatesAndNotify();
// 
// autoUpdater.on('update-available', () => {
//   mainWindow?.webContents.send('update:available');
// });
// 
// autoUpdater.on('update-downloaded', () => {
//   mainWindow?.webContents.send('update:downloaded');
// });
// 
// ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());

logger.info('Main process initialized');