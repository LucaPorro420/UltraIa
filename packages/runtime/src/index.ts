//! @ultraia/runtime — public API surface for the desktop runtime.
// Re-exports all subsystems: types, config, logger, event bus, task manager,
// module registry/manager, resources, commands, health, recovery, memory,
// context, runtime orchestrator, installer, API (HTTP/WS), and adapters.
export * from './types';
export * from './config';
export * from './logger';
export * from './event-bus';
export * from './task-manager';
export * from './module-registry';
export * from './module-manager';
export * from './resource-manager';
export * from './command-executor';
export * from './health';
export * from './recovery';
export * from './memory';
export * from './context';
export * from './runtime';
export * from './installer';
export * from './api/ws';
export * from './api/server';
export * from './api/runtime-handlers';
export * from './adapters/ports';
export * from './adapters/db';
export * from './adapters/ai';
export * from './adapters/tools';
export * from './adapters/omag';
export * from './adapters/core';