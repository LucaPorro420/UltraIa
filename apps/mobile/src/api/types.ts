/**
 * Tipos de la API HTTP de UltraIa (apps/web). Definidos a mano — la app móvil
 * NO importa @ultraia/core (Metro no resuelve node:* con webpackIgnore).
 * Fuentes: routes en apps/web/src/app/api/ + domain/publications.ts.
 */

export type Canal = 'youtube_shorts' | 'tiktok' | 'instagram' | 'blog' | 'telegram' | 'discord' | 'slack';
export type PublicationEstado = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'FAILED';
export type PublicationFiltro = PublicationEstado | 'ALL';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export interface Publication {
  id: string;
  canal: string;
  tema: string;
  caption: string;
  estado: PublicationEstado;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  creadoPorId: string | null;
  paqueteJson: string;
  error?: string | null;
}

export interface ListPublicationsResponse {
  items: Publication[];
  nextCursor: string | null;
}

export interface CanalKpis {
  canal: string;
  publicadas: number;
  fallidas: number;
  pendientes: number;
  tasaExito: number;
  scorePromedio: number | null;
}

export interface MetricsResponse {
  ok: boolean;
  porCanal: CanalKpis[];
  totales?: { publicadas: number; fallidas: number; pendientes: number; tasaExito: number };
  analytics?: unknown;
  error?: string;
}

export interface CloudFile {
  path: string;
  name: string;
  size: number;
  type: string;
  updatedAt?: string;
}

export interface CloudFilesResponse {
  files: CloudFile[];
  manifest: unknown;
  base: string;
}

export interface CloudStatusResponse {
  ok: boolean;
  providers: Record<string, { ok: boolean; detalle?: string }>;
  presupuesto?: string;
}

export interface BlogPost {
  id: string;
  tema: string;
  caption: string;
  contenido: string;
  media: string[];
  publishedAt: string;
}
