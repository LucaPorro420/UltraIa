/**
 * connections-catalog.ts — Catálogo completo de integraciones del proyecto UltraIa.
 *
 * Propósito: un único lugar que lista TODAS las conexiones necesarias o previstas
 * para el proyecto (estilo "Integrations" de GitHub / marketplace de Vercel):
 * redes sociales, mensajería, monetización, email, dev, IA, media, búsqueda,
 * nube, analítica y automatización.
 *
 * Es un módulo PURO y determinista (sin deps, sin I/O). El estado de cada entrada
 * se calcula con `buildConnectionCatalog` a partir de (a) las conexiones guardadas
 * en DB (canales sociales) y (b) las variables de entorno presentes en el servidor.
 *
 * QUÉ ES: fuente de verdad de qué existe, qué está conectado y qué está previsto.
 * PARA QUÉ: la UI `/connections` lo renderiza agrupado por categoría.
 * POR QUÉ: el usuario pidió "un apartado ... con todas las conexiones necesarias o
 * posibles ... para el proyecto en general".
 */

export type ConnectionCategory =
  | 'social'
  | 'community'
  | 'monetization'
  | 'email'
  | 'devops'
  | 'ai'
  | 'media'
  | 'search'
  | 'cloud'
  | 'analytics'
  | 'automation';

export type ConnectionState = 'connected' | 'available' | 'keyless' | 'planned';

export type ConnectionAuthType = 'oauth' | 'token' | 'env' | 'keyless' | 'planned';

export interface CatalogEntry {
  /** id estable (único). Para canales sociales == canal de CANALES. */
  id: string;
  category: ConnectionCategory;
  label: string;
  description: string;
  authType: ConnectionAuthType;
  status: ConnectionState;
  /** Si es un canal social guardable vía el flujo 2FA (== valor de CANALES). */
  channel?: string;
  /** Variables de entorno que, si están presentes, marcan la entrada como conectada. */
  envVars?: string[];
  /** Enlace a dónde obtener la clave/token. */
  docsUrl?: string;
  /** Siempre disponible sin clave (keyless-first del proyecto). */
  keyless?: boolean;
  /** Previsto pero aún no cableado funcionalmente. */
  planned?: boolean;
}

export interface CatalogCategoryMeta {
  label: string;
  description: string;
  /** Nombre del icono lucide (mapeado en el cliente). */
  icon: string;
}

export const CATEGORY_META: Record<ConnectionCategory, CatalogCategoryMeta> = {
  social: {
    label: 'Redes sociales y video',
    description: 'Alcance y publicación automática (AutoPub). Conecta y publica con aprobación humana.',
    icon: 'Share2',
  },
  community: {
    label: 'Mensajería y comunidad',
    description: 'Canales de difusión directa a tu audiencia.',
    icon: 'MessagesSquare',
  },
  monetization: {
    label: 'Monetización y membresías',
    description: 'Ingresos recurrentes y por contenido (Sponsors, affiliates, suscripciones).',
    icon: 'Wallet',
  },
  email: {
    label: 'Email y newsletter',
    description: 'Envío transaccional (2FA) y newsletters de crecimiento.',
    icon: 'Mail',
  },
  devops: {
    label: 'Dev y código',
    description: 'Repos, CI y patrocinios de la comunidad open-source.',
    icon: 'GitBranch',
  },
  ai: {
    label: 'Proveedores de IA',
    description: 'Modelos para el gateway (ULTRAIA_PROVIDER). Keyless-first: Ollama/LM Studio locales.',
    icon: 'Sparkles',
  },
  media: {
    label: 'Generación de media',
    description: 'Imagen, video y música para OMAG y los agentes creativos.',
    icon: 'Clapperboard',
  },
  search: {
    label: 'Búsqueda y datos',
    description: 'Fuentes de conocimiento para AgentReach y los agentes de investigación.',
    icon: 'Search',
  },
  cloud: {
    label: 'Nube y almacenamiento',
    description: 'Respaldo del cloud personal y assets de publicación.',
    icon: 'Cloud',
  },
  analytics: {
    label: 'Analítica',
    description: 'Métricas de canal para el bucle de mejora (F5). Previsto.',
    icon: 'BarChart3',
  },
  automation: {
    label: 'Automatización',
    description: 'Orquestación externa del flujo de contenido. Previsto.',
    icon: 'Workflow',
  },
};

export const CATEGORY_ORDER: ConnectionCategory[] = [
  'social',
  'community',
  'monetization',
  'email',
  'devops',
  'ai',
  'media',
  'search',
  'cloud',
  'analytics',
  'automation',
];

/** Definiciones estáticas (sin estado). El estado se inyecta en buildConnectionCatalog. */
interface CatalogDef extends Omit<CatalogEntry, 'status'> {}

const DEFS: CatalogDef[] = [
  // ---- social ----
  { id: 'youtube_shorts', category: 'social', label: 'YouTube Shorts', channel: 'youtube_shorts', authType: 'oauth', description: 'Shorts 9:16 automáticos. Monetiza: AdSense, Shorts Fund, affiliates.', docsUrl: 'https://console.cloud.google.com/apis/credentials' },
  { id: 'youtube', category: 'social', label: 'YouTube (canal)', channel: 'youtube', authType: 'oauth', description: 'Canal completo. Monetiza: AdSense, membresías y affiliates.', docsUrl: 'https://console.cloud.google.com/apis/credentials' },
  { id: 'tiktok', category: 'social', label: 'TikTok', channel: 'tiktok', authType: 'oauth', description: 'Content Posting API (Direct Post). Alcance viral.', docsUrl: 'https://developers.tiktok.com/' },
  { id: 'x', category: 'social', label: 'X (Twitter)', channel: 'x', authType: 'token', description: 'API v2 (Bearer). Alcance y tráfico.', docsUrl: 'https://developer.x.com/' },
  { id: 'instagram', category: 'social', label: 'Instagram', channel: 'instagram', authType: 'oauth', description: 'Graph API (IG Business). Reels + alcance visual.', docsUrl: 'https://developers.facebook.com/' },
  { id: 'threads', category: 'social', label: 'Threads', channel: 'threads', authType: 'oauth', description: 'Graph API (Threads). Texto corto de alcance.', docsUrl: 'https://developers.facebook.com/' },
  { id: 'facebook', category: 'social', label: 'Facebook', channel: 'facebook', authType: 'oauth', description: 'Graph API (página). Reels + comunidad.', docsUrl: 'https://developers.facebook.com/' },
  { id: 'linkedin', category: 'social', label: 'LinkedIn', channel: 'linkedin', authType: 'oauth', description: 'Share API v2. Alcance B2B.', docsUrl: 'https://www.linkedin.com/developers/' },
  { id: 'pinterest', category: 'social', label: 'Pinterest', channel: 'pinterest', authType: 'token', description: 'API v5 (pin de video). Affiliate/ecommerce + alcance visual.', docsUrl: 'https://developers.pinterest.com/' },
  { id: 'reddit', category: 'social', label: 'Reddit', channel: 'reddit', authType: 'oauth', description: 'oauth.reddit.com/api/submit. Tráfico vía comunidades.', docsUrl: 'https://www.reddit.com/prefs/apps' },
  { id: 'whatsapp', category: 'social', label: 'WhatsApp Business', channel: 'whatsapp', authType: 'token', description: 'Cloud API. Alcance directo vía mensajería.', docsUrl: 'https://developers.facebook.com/docs/whatsapp/' },

  // ---- community ----
  { id: 'telegram', category: 'community', label: 'Telegram', channel: 'telegram', authType: 'token', description: 'Bot API (100% gratis). Difusión a canal/chat.', docsUrl: 'https://t.me/BotFather' },
  { id: 'discord', category: 'community', label: 'Discord', channel: 'discord', authType: 'token', description: 'Webhook del canal. Comunidad y anuncios.', docsUrl: 'https://discord.com/developers/docs/resources/webhook' },
  { id: 'slack', category: 'community', label: 'Slack', channel: 'slack', authType: 'token', description: 'Bot app (xoxb-). Equipo e internos.', docsUrl: 'https://api.slack.com/apps' },

  // ---- monetization ----
  { id: 'medium', category: 'monetization', label: 'Medium', channel: 'medium', authType: 'token', description: 'Partner Program por lectura. Alcance editorial.', docsUrl: 'https://medium.com/settings/security' },
  { id: 'substack', category: 'monetization', label: 'Substack', channel: 'substack', authType: 'token', description: 'Newsletter de pago. Alcance directo y recurrente.', docsUrl: 'https://substack.com/' },
  { id: 'patreon', category: 'monetization', label: 'Patreon', channel: 'patreon', authType: 'oauth', description: 'Membresías recurrentes. Ingreso estable.', docsUrl: 'https://www.patreon.com/portal/registration/register-clients' },
  { id: 'twitch', category: 'monetization', label: 'Twitch', channel: 'twitch', authType: 'oauth', description: 'Subs/bits. Alcance en streaming.', docsUrl: 'https://dev.twitch.tv/console' },

  // ---- email ----
  { id: 'email', category: 'email', label: 'Email / Newsletter (SMTP)', channel: 'email', authType: 'env', envVars: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'], description: 'Envío SMTP real (2FA + newsletters). Sin clave = dev-log.', docsUrl: 'https://nodemailer.com/smtp/' },
  { id: 'outlook', category: 'email', label: 'Microsoft 365 / Outlook', channel: 'outlook', authType: 'oauth', description: 'Graph API. Alcance B2B y corporativo.', docsUrl: 'https://learn.microsoft.com/graph/' },

  // ---- devops ----
  { id: 'github', category: 'devops', label: 'GitHub', channel: 'github', authType: 'token', description: 'PAT. Sponsors + alcance open-source.', docsUrl: 'https://github.com/settings/tokens' },
  { id: 'gitlab', category: 'devops', label: 'GitLab', channel: 'gitlab', authType: 'token', description: 'PAT. CI/enterprise + alcance dev.', docsUrl: 'https://gitlab.com/-/user_settings/personal_access_tokens' },

  // ---- ai ----
  { id: 'openai', category: 'ai', label: 'OpenAI', authType: 'env', envVars: ['OPENAI_API_KEY'], description: 'GPT-4o/mini vía Vercel AI SDK. ULTRAIA_PROVIDER=openai.', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'google', category: 'ai', label: 'Google Gemini', authType: 'env', envVars: ['GOOGLE_API_KEY'], description: 'Gemini (tier gratuito). ULTRAIA_PROVIDER=google.', docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'deepseek', category: 'ai', label: 'DeepSeek', authType: 'env', envVars: ['DEEPSEEK_API_KEY'], description: 'Modelos open-weights vía API. ULTRAIA_PROVIDER=deepseek.', docsUrl: 'https://platform.deepseek.com/' },
  { id: 'ollama', category: 'ai', label: 'Ollama (local)', authType: 'keyless', keyless: true, envVars: ['OLLAMA_BASE_URL'], description: 'Modelos locales SIN clave. Valor por defecto del gateway.', docsUrl: 'https://ollama.com/' },
  { id: 'lmstudio', category: 'ai', label: 'LM Studio (local)', authType: 'keyless', keyless: true, envVars: ['LMSTUDIO_BASE_URL'], description: 'OpenAI-compatible local en :1234. Sin clave.', docsUrl: 'https://lmstudio.ai/' },
  { id: 'gen-engine', category: 'ai', label: 'Gen-Engine (self-host)', authType: 'keyless', keyless: true, envVars: ['GEN_ENGINE_URL'], description: 'Motor de media propio (start.py :8100). Keyless por defecto.', docsUrl: 'https://github.com/LucaPorro420/UltraIa' },
  { id: 'anthropic', category: 'ai', label: 'Anthropic Claude', authType: 'planned', planned: true, envVars: ['ANTHROPIC_API_KEY'], description: 'Previsto como proveedor del gateway (ULTRAIA_PROVIDER=anthropic).', docsUrl: 'https://console.anthropic.com/' },
  { id: 'xai', category: 'ai', label: 'xAI Grok', authType: 'planned', planned: true, envVars: ['XAI_API_KEY'], description: 'Previsto como proveedor del gateway.', docsUrl: 'https://x.ai/api' },

  // ---- media ----
  { id: 'pollinations', category: 'media', label: 'Pollinations', authType: 'keyless', keyless: true, description: 'Imagen/video keyless. Siempre disponible sin clave.', docsUrl: 'https://pollinations.ai/' },
  { id: 'meigen', category: 'media', label: 'MeiGEN', authType: 'keyless', keyless: true, envVars: ['MEIGEN_API_TOKEN'], description: 'Imagen de alta calidad (fallback keyless si no hay token).', docsUrl: 'https://meigen.ai/' },
  { id: 'tunetank', category: 'media', label: 'Tunetank (música)', authType: 'keyless', keyless: true, description: 'Música keyless con fallback a composición propia.', docsUrl: 'https://tunetank.com/' },
  { id: 'suno', category: 'media', label: 'Suno / Udio', authType: 'planned', planned: true, description: 'Música generada por prompt. Previsto para OMAG audio.', docsUrl: 'https://suno.com/' },
  { id: 'capcut', category: 'media', label: 'CapCut Seedance', authType: 'planned', planned: true, description: 'Video 4K nativo. Previsto como provider premium del Gen-Engine.', docsUrl: 'https://www.capcut.com/' },
  { id: 'veo', category: 'media', label: 'Google Veo', authType: 'planned', planned: true, description: 'Video 4K con audio nativo. Previsto como provider premium.', docsUrl: 'https://deepmind.google/technologies/veo/' },

  // ---- search ----
  { id: 'duckduckgo', category: 'search', label: 'DuckDuckGo', authType: 'keyless', keyless: true, description: 'Búsqueda web keyless (AgentReach).', docsUrl: 'https://duckduckgo.com/' },
  { id: 'rjina', category: 'search', label: 'r.jina.ai', authType: 'keyless', keyless: true, description: 'Lectura de páginas keyless (AgentReach).', docsUrl: 'https://jina.ai/' },
  { id: 'arxiv', category: 'search', label: 'arXiv / OpenAlex', authType: 'keyless', keyless: true, description: 'Papers y PDFs keyless (pdfsearch).', docsUrl: 'https://arxiv.org/' },
  { id: 'exa', category: 'search', label: 'Exa', authType: 'env', envVars: ['EXA_API_KEY'], description: 'Búsqueda neural opcional (AgentReach).', docsUrl: 'https://exa.ai/' },
  { id: 'brave', category: 'search', label: 'Brave Search', authType: 'env', envVars: ['BRAVE_API_KEY'], description: 'API de búsqueda opcional (2k/mes gratis).', docsUrl: 'https://brave.com/search/api/' },
  { id: 'firecrawl', category: 'search', label: 'Firecrawl', authType: 'env', envVars: ['FIRECRAWL_API_KEY'], description: 'Scraping agentic opcional (research).', docsUrl: 'https://firecrawl.dev/' },

  // ---- cloud ----
  { id: 'local-cloud', category: 'cloud', label: 'Cloud local', authType: 'keyless', keyless: true, envVars: ['ULTRAIA_CLOUD_DIR'], description: 'Respaldo en disco local del cloud personal.', docsUrl: 'https://github.com/LucaPorro420/UltraIa' },
  { id: 'vercel', category: 'cloud', label: 'Vercel', authType: 'keyless', keyless: true, description: 'Despliegue del web app (vars de entorno automáticas).', docsUrl: 'https://vercel.com/' },
  { id: 'cloudflare-r2', category: 'cloud', label: 'Cloudflare R2', authType: 'env', envVars: ['CLOUDFLARE_R2_WORKER_URL', 'CLOUDFLARE_R2_TOKEN'], description: 'Almacenamiento de assets (10GB egress $0).', docsUrl: 'https://developers.cloudflare.com/r2/' },
  { id: 'supabase', category: 'cloud', label: 'Supabase', authType: 'env', envVars: ['SUPABASE_URL', 'SUPABASE_KEY'], description: 'Postgres + storage (alternativa a SQLite en prod).', docsUrl: 'https://supabase.com/' },

  // ---- analytics ----
  { id: 'plausible', category: 'analytics', label: 'Plausible', authType: 'planned', planned: true, envVars: ['PLAUSIBLE_API_KEY'], description: 'Analítica privada del blog/web. Previsto.', docsUrl: 'https://plausible.io/' },
  { id: 'google-analytics', category: 'analytics', label: 'Google Analytics', authType: 'planned', planned: true, envVars: ['GA4_MEASUREMENT_ID'], description: 'Métricas web. Previsto.', docsUrl: 'https://analytics.google.com/' },
  { id: 'meta-insights', category: 'analytics', label: 'Meta Insights', authType: 'planned', planned: true, description: 'Métricas IG/FB para el bucle de mejora. Previsto.', docsUrl: 'https://developers.facebook.com/docs/instagram-api/' },
  { id: 'youtube-analytics', category: 'analytics', label: 'YouTube Analytics', authType: 'planned', planned: true, description: 'Retención/shares para crecer. Previsto.', docsUrl: 'https://developers.google.com/youtube/analytics' },

  // ---- automation ----
  { id: 'zapier', category: 'automation', label: 'Zapier', authType: 'planned', planned: true, description: 'Webhooks de publicación cruzada. Previsto.', docsUrl: 'https://zapier.com/' },
  { id: 'n8n', category: 'automation', label: 'n8n', authType: 'planned', planned: true, description: 'Orquestación self-host del pipeline. Previsto.', docsUrl: 'https://n8n.io/' },
  { id: 'make', category: 'automation', label: 'Make', authType: 'planned', planned: true, description: 'Automatización visual. Previsto.', docsUrl: 'https://www.make.com/' },
  { id: 'crewai', category: 'automation', label: 'CrewAI', authType: 'planned', planned: true, description: 'Multi-agente externo (puente opcional). Previsto.', docsUrl: 'https://www.crewai.com/' },
];

export interface BuildCatalogOpts {
  /** Canales sociales conectados (desde listConnections). */
  connectedChannels?: Iterable<string>;
  /** Variables de entorno del servidor (process.env). */
  env?: Record<string, string | undefined>;
}

function computeStatus(def: CatalogDef, connected: Set<string>, env: Record<string, string | undefined>): ConnectionState {
  if (def.planned) return 'planned';
  if (def.keyless) return 'keyless';
  if (def.channel && connected.has(def.channel)) return 'connected';
  if (def.envVars && def.envVars.some((v) => (env[v] ?? '').trim().length > 0)) return 'connected';
  return 'available';
}

/** Construye el catálogo completo con el estado calculado para el servidor actual. */
export function buildConnectionCatalog(opts: BuildCatalogOpts = {}): CatalogEntry[] {
  const connected = new Set(opts.connectedChannels ?? []);
  const env = opts.env ?? {};
  return DEFS.map((def) => ({
    ...def,
    status: computeStatus(def, connected, env),
  }));
}

/** Agrupa el catálogo por categoría respetando CATEGORY_ORDER. */
export function groupCatalogByCategory(catalog: CatalogEntry[]): Array<{ category: ConnectionCategory; meta: CatalogCategoryMeta; entries: CatalogEntry[] }> {
  const map = new Map<ConnectionCategory, CatalogEntry[]>();
  for (const e of catalog) {
    if (!map.has(e.category)) map.set(e.category, []);
    map.get(e.category)!.push(e);
  }
  return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
    category: c,
    meta: CATEGORY_META[c],
    entries: map.get(c)!,
  }));
}

export const CONNECTION_CATALOG_COUNT = DEFS.length;
