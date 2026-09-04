//! OMAG (Open Media Autonomous Generation) — the world engine.
// Re-exports all OMAG subsystems: MediaField (entities/relations/events),
// WorldTransitionEngine, Timeline, Memory, Generators, Critics, Orchestrator,
// Project (long-form), AudioLibrary, Sound synthesis.
export * from './mediafield';
export * from './world';
export * from './timeline';
export * from './memory';
export * from './generators';
export * from './critics';
export * from './orchestrator';
export * from './project';
export * from './audiolibrary';
export * from './sound';
