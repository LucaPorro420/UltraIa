/**
 * Plataforma Unificada - Core Package
 * 
 * Main entry point exporting all core functionality:
 * - Types (User, Course, Agent, LLM, MCP, Plugin, etc.)
 * - Configuration (loadConfig, getConfig, configSchema)
 * - Utilities (ID generation, date formatting, hashing, validation, etc.)
 */

// Types
export * from './types';

// Configuration
export { 
  loadConfig, 
  getConfig, 
  resetConfig, 
  configSchema,
  type Config 
} from './config';

// Utilities
export * from './utils';