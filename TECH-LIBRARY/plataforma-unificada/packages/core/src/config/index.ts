/**
 * Configuration for Plataforma Unificada
 */

import { z } from 'zod';

export const configSchema = z.object({
  // Application
  app: z.object({
    name: z.string().default('Plataforma Total Unificada'),
    version: z.string().default('1.0.0'),
    env: z.enum(['development', 'staging', 'production']).default('development'),
    port: z.number().default(3000),
    host: z.string().default('localhost'),
    url: z.string().url().default('http://localhost:3000'),
  }),

  // Database
  database: z.object({
    type: z.enum(['sqlite', 'postgresql', 'mysql']).default('sqlite'),
    path: z.string().default('./data/plataforma.db'),
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    name: z.string().optional(),
    ssl: z.boolean().default(false),
    pool: z.object({
      min: z.number().default(2),
      max: z.number().default(10),
    }).optional(),
  }),

  // FreeLLMAPI Gateway
  gateway: z.object({
    url: z.string().url().default('http://localhost:3001'),
    apiKey: z.string().optional(),
    timeout: z.number().default(120000),
    defaultModel: z.string().default('auto'),
    fallbackModels: z.array(z.string()).default(['auto:coding', 'auto:general']),
    enableCache: z.boolean().default(true),
    cacheTTL: z.number().default(3600),
  }),

  // Ollama (fallback/local)
  ollama: z.object({
    enabled: z.boolean().default(true),
    url: z.string().url().default('http://localhost:11434'),
    defaultModel: z.string().default('llama3.1:8b'),
    timeout: z.number().default(120000),
    pullOnMissing: z.boolean().default(true),
  }),

  // Authentication
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('7d'),
    refreshExpiresIn: z.string().default('30d'),
    bcryptRounds: z.number().default(12),
    sessionSecret: z.string().min(32),
  }),

  // AI Agents
  agents: z.object({
    enabled: z.boolean().default(true),
    maxConcurrent: z.number().default(5),
    defaultModel: z.string().default('auto'),
    orchestratorModel: z.string().default('auto'),
    timeout: z.number().default(300000),
    maxRetries: z.number().default(3),
    humanInTheLoop: z.boolean().default(true),
    approvalRequired: z.array(z.string()).default(['production:deploy', 'git:push', 'database:schema']),
  }),

  // MCP Server
  mcp: z.object({
    enabled: z.boolean().default(true),
    port: z.number().default(3002),
    path: z.string().default('/mcp'),
    authRequired: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default(['*']),
  }),

  // Plugin System
  plugins: z.object({
    enabled: z.boolean().default(true),
    directory: z.string().default('./plugins'),
    autoLoad: z.boolean().default(true),
    allowUnsigned: z.boolean().default(false),
    maxPlugins: z.number().default(50),
  }),

  // Sync
  sync: z.object({
    enabled: z.boolean().default(true),
    interval: z.number().default(300000), // 5 minutes
    conflictResolution: z.enum(['local', 'remote', 'merge', 'manual']).default('merge'),
    maxRetries: z.number().default(3),
    batchSize: z.number().default(100),
  }),

  // Offline
  offline: z.object({
    enabled: z.boolean().default(true),
    maxQueueSize: z.number().default(1000),
    syncOnReconnect: z.boolean().default(true),
    localModels: z.array(z.string()).default(['llama3.1:8b', 'phi3:mini']),
  }),

  // File Storage
  storage: z.object({
    type: z.enum(['local', 's3', 'r2', 'gcs', 'azure']).default('local'),
    path: z.string().default('./storage'),
    bucket: z.string().optional(),
    region: z.string().optional(),
    accessKey: z.string().optional(),
    secretKey: z.string().optional(),
    cdnUrl: z.string().optional(),
  }),

  // Monitoring
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsPort: z.number().default(9090),
    healthCheckInterval: z.number().default(30000),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    sentryDsn: z.string().optional(),
  }),

  // Email
  email: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['smtp', 'sendgrid', 'mailgun', 'ses']).default('smtp'),
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    from: z.string().email().optional(),
  }),

  // Payments
  payments: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['lemonsqueezy', 'stripe', 'paddle']).default('lemonsqueezy'),
    apiKey: z.string().optional(),
    webhookSecret: z.string().optional(),
    products: z.record(z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      currency: z.string().default('USD'),
      interval: z.enum(['month', 'year', 'lifetime']).optional(),
    })).optional(),
  }),

  // Feature Flags
  features: z.object({
    aiChat: z.boolean().default(true),
    agentOrchestration: z.boolean().default(true),
    mcpServer: z.boolean().default(true),
    plugins: z.boolean().default(true),
    offlineMode: z.boolean().default(true),
    sync: z.boolean().default(true),
    certificates: z.boolean().default(true),
    gamification: z.boolean().default(true),
    monetization: z.boolean().default(false),
    multiLanguage: z.boolean().default(true),
    voiceInput: z.boolean().default(false),
    videoGeneration: z.boolean().default(false),
  }),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(envOverrides?: Partial<Config>): Config {
  if (cachedConfig && !envOverrides) {
    return cachedConfig;
  }

  const env = process.env;
  
  const config: Config = {
    app: {
      name: env.APP_NAME || 'Plataforma Total Unificada',
      version: env.APP_VERSION || '1.0.0',
      env: (env.NODE_ENV as Config['app']['env']) || 'development',
      port: parseInt(env.PORT || '3000', 10),
      host: env.HOST || 'localhost',
      url: env.APP_URL || 'http://localhost:3000',
    },
    database: {
      type: (env.DB_TYPE as Config['database']['type']) || 'sqlite',
      path: env.DB_PATH || './data/plataforma.db',
      host: env.DB_HOST,
      port: env.DB_PORT ? parseInt(env.DB_PORT, 10) : undefined,
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      name: env.DB_NAME,
      ssl: env.DB_SSL === 'true',
      pool: env.DB_POOL_MIN ? {
        min: parseInt(env.DB_POOL_MIN, 10),
        max: parseInt(env.DB_POOL_MAX || '10', 10),
      } : undefined,
    },
    gateway: {
      url: env.GATEWAY_URL || 'http://localhost:3001',
      apiKey: env.GATEWAY_API_KEY,
      timeout: parseInt(env.GATEWAY_TIMEOUT || '120000', 10),
      defaultModel: env.GATEWAY_DEFAULT_MODEL || 'auto',
      fallbackModels: (env.GATEWAY_FALLBACK_MODELS || 'auto:coding,auto:general').split(','),
      enableCache: env.GATEWAY_ENABLE_CACHE !== 'false',
      cacheTTL: parseInt(env.GATEWAY_CACHE_TTL || '3600', 10),
    },
    ollama: {
      enabled: env.OLLAMA_ENABLED !== 'false',
      url: env.OLLAMA_URL || 'http://localhost:11434',
      defaultModel: env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b',
      timeout: parseInt(env.OLLAMA_TIMEOUT || '120000', 10),
      pullOnMissing: env.OLLAMA_PULL_ON_MISSING !== 'false',
    },
    auth: {
      jwtSecret: env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars',
      jwtExpiresIn: env.JWT_EXPIRES_IN || '7d',
      refreshExpiresIn: env.REFRESH_EXPIRES_IN || '30d',
      bcryptRounds: parseInt(env.BCRYPT_ROUNDS || '12', 10),
      sessionSecret: env.SESSION_SECRET || 'dev-session-secret-change-in-production-min-32-chars',
    },
    agents: {
      enabled: env.AGENTS_ENABLED !== 'false',
      maxConcurrent: parseInt(env.AGENTS_MAX_CONCURRENT || '5', 10),
      defaultModel: env.AGENTS_DEFAULT_MODEL || 'auto',
      orchestratorModel: env.AGENTS_ORCHESTRATOR_MODEL || 'auto',
      timeout: parseInt(env.AGENTS_TIMEOUT || '300000', 10),
      maxRetries: parseInt(env.AGENTS_MAX_RETRIES || '3', 10),
      humanInTheLoop: env.AGENTS_HUMAN_IN_THE_LOOP !== 'false',
      approvalRequired: (env.AGENTS_APPROVAL_REQUIRED || 'production:deploy,git:push,database:schema').split(','),
    },
    mcp: {
      enabled: env.MCP_ENABLED !== 'false',
      port: parseInt(env.MCP_PORT || '3002', 10),
      path: env.MCP_PATH || '/mcp',
      authRequired: env.MCP_AUTH_REQUIRED !== 'false',
      allowedOrigins: (env.MCP_ALLOWED_ORIGINS || '*').split(','),
    },
    plugins: {
      enabled: env.PLUGINS_ENABLED !== 'false',
      directory: env.PLUGINS_DIRECTORY || './plugins',
      autoLoad: env.PLUGINS_AUTO_LOAD !== 'false',
      allowUnsigned: env.PLUGINS_ALLOW_UNSIGNED === 'true',
      maxPlugins: parseInt(env.PLUGINS_MAX || '50', 10),
    },
    sync: {
      enabled: env.SYNC_ENABLED !== 'false',
      interval: parseInt(env.SYNC_INTERVAL || '300000', 10),
      conflictResolution: (env.SYNC_CONFLICT_RESOLUTION as Config['sync']['conflictResolution']) || 'merge',
      maxRetries: parseInt(env.SYNC_MAX_RETRIES || '3', 10),
      batchSize: parseInt(env.SYNC_BATCH_SIZE || '100', 10),
    },
    offline: {
      enabled: env.OFFLINE_ENABLED !== 'false',
      maxQueueSize: parseInt(env.OFFLINE_MAX_QUEUE || '1000', 10),
      syncOnReconnect: env.OFFLINE_SYNC_ON_RECONNECT !== 'false',
      localModels: (env.OFFLINE_LOCAL_MODELS || 'llama3.1:8b,phi3:mini').split(','),
    },
    storage: {
      type: (env.STORAGE_TYPE as Config['storage']['type']) || 'local',
      path: env.STORAGE_PATH || './storage',
      bucket: env.STORAGE_BUCKET,
      region: env.STORAGE_REGION,
      accessKey: env.STORAGE_ACCESS_KEY,
      secretKey: env.STORAGE_SECRET_KEY,
      cdnUrl: env.STORAGE_CDN_URL,
    },
    monitoring: {
      enabled: env.MONITORING_ENABLED !== 'false',
      metricsPort: parseInt(env.METRICS_PORT || '9090', 10),
      healthCheckInterval: parseInt(env.HEALTH_CHECK_INTERVAL || '30000', 10),
      logLevel: (env.LOG_LEVEL as Config['monitoring']['logLevel']) || 'info',
      sentryDsn: env.SENTRY_DSN,
    },
    email: {
      enabled: env.EMAIL_ENABLED === 'true',
      provider: (env.EMAIL_PROVIDER as Config['email']['provider']) || 'smtp',
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT ? parseInt(env.EMAIL_PORT, 10) : undefined,
      username: env.EMAIL_USERNAME,
      password: env.EMAIL_PASSWORD,
      from: env.EMAIL_FROM,
    },
    payments: {
      enabled: env.PAYMENTS_ENABLED === 'true',
      provider: (env.PAYMENTS_PROVIDER as Config['payments']['provider']) || 'lemonsqueezy',
      apiKey: env.PAYMENTS_API_KEY,
      webhookSecret: env.PAYMENTS_WEBHOOK_SECRET,
      products: env.PAYMENTS_PRODUCTS ? JSON.parse(env.PAYMENTS_PRODUCTS) : undefined,
    },
    features: {
      aiChat: env.FEATURE_AI_CHAT !== 'false',
      agentOrchestration: env.FEATURE_AGENT_ORCHESTRATION !== 'false',
      mcpServer: env.FEATURE_MCP_SERVER !== 'false',
      plugins: env.FEATURE_PLUGINS !== 'false',
      offlineMode: env.FEATURE_OFFLINE_MODE !== 'false',
      sync: env.FEATURE_SYNC !== 'false',
      certificates: env.FEATURE_CERTIFICATES !== 'false',
      gamification: env.FEATURE_GAMIFICATION !== 'false',
      monetization: env.FEATURE_MONETIZATION === 'true',
      multiLanguage: env.FEATURE_MULTI_LANGUAGE !== 'false',
      voiceInput: env.FEATURE_VOICE_INPUT === 'true',
      videoGeneration: env.FEATURE_VIDEO_GENERATION === 'true',
    },
  };

  // Validate with Zod
  const result = configSchema.safeParse(config);
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration');
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function getConfig(): Config {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}