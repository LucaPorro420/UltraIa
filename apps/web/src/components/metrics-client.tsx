'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Eye,
  Users,
  Video,
  TriangleAlert,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CanalKpis {
  canal: string;
  total: number;
  publicadas: number;
  fallidas: number;
  pendientes: number;
  tasaExito: number | null;
  scorePromedio: number | null;
  vistasReales?: number;
  likesReales?: number;
  comentariosReales?: number;
  compartidosReales?: number;
}

interface Totales {
  total: number;
  publicadas: number;
  fallidas: number;
  pendientes: number;
  tasaExito: number | null;
  scorePromedio: number | null;
}

interface KpisResponse {
  ok: boolean;
  error?: string;
  porCanal?: CanalKpis[];
  totales?: Totales;
  analytics?: {
    platform: string;
    ok: boolean;
    canal: string | null;
    vistas?: number;
    likes?: number;
    subscriptores?: number;
    videoCount?: number;
    error?: string;
  };
}

const PLATFORMS = ['youtube', 'tiktok', 'x', 'instagram', 'threads', 'telegram'] as const;

const fmt = (n: number | null | undefined): string => (typeof n === 'number' ? n.toLocaleString('es-PE') : '—');

function badgeClase(canal: string): string {
  const map: Record<string, string> = {
    youtube_shorts: 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20',
    tiktok: 'bg-neutral-500/10 text-neutral-200 ring-1 ring-neutral-500/20',
    instagram: 'bg-pink-500/10 text-pink-300 ring-1 ring-pink-500/20',
    telegram: 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20',
    discord: 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20',
    slack: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    blog: 'bg-primary/10 text-primary ring-1 ring-primary/20',
  };
  return map[canal] ?? 'bg-neutral-500/10 text-neutral-300 ring-1 ring-neutral-500/20';
}

export function MetricsClient({ initialKpis }: { initialKpis?: KpisResponse | null } = {}) {
  const [kpis, setKpis] = useState<KpisResponse | null>(initialKpis ?? null);
  const [loading, setLoading] = useState(!initialKpis);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<(typeof PLATFORMS)[number]>('youtube');
  const [channelId, setChannelId] = useState('');
  const [analytics, setAnalytics] = useState<KpisResponse['analytics'] | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const loadKpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/publications/metrics');
      if (res.status === 401 || res.status === 403) {
        setError('Sesión no autorizada (se requiere rol ADMIN).');
        setKpis(null);
        return;
      }
      const data = (await res.json()) as KpisResponse;
      setKpis(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setAnalytics(null);
    try {
      const params = new URLSearchParams({ platform });
      if (channelId.trim()) params.set('channelId', channelId.trim());
      const res = await fetch(`/api/publications/metrics?${params.toString()}`);
      const data = (await res.json()) as KpisResponse;
      setAnalytics(data.analytics ?? null);
      if (data.analytics && !data.analytics.ok) setAnalyticsError(data.analytics.error ?? 'fail-soft');
      if (data.porCanal) setKpis(data);
    } catch (e) {
      setAnalyticsError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyticsLoading(false);
    }
  }, [platform, channelId]);

  const totales = kpis?.totales;
  const porCanal = kpis?.porCanal ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Métricas de publicación</h1>
          <p className="mt-1 text-[13px] text-neutral-400">
            KPIs de la cola AutoPub (F5) + analytics reales por API de canal (YouTube keyless-first, resto fail-soft).
          </p>
        </div>
        <Button variant="ghost" onClick={() => void loadKpis()} disabled={loading} title="Refrescar KPIs" className="px-2.5 py-2.5">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {error && (
        <div className="glass-panel flex items-center gap-2 rounded-lg border border-destructive/30 px-4 py-3 text-[13px] text-destructive">
          <TriangleAlert className="h-4 w-4" /> {error}
        </div>
      )}

      {loading && !kpis ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border-subtle bg-panel" />
          ))}
        </div>
      ) : (
        totales && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Publicaciones" value={fmt(totales.total)} icon={<BarChart3 className="h-4 w-4" />} hint="en la cola" />
            <StatCard label="Publicadas" value={fmt(totales.publicadas)} icon={<CheckCircle2 className="h-4 w-4" />} hint="PUBLISHED" />
            <StatCard label="Fallidas" value={fmt(totales.fallidas)} icon={<XCircle className="h-4 w-4" />} hint="FAILED" />
            <StatCard label="Pendientes" value={fmt(totales.pendientes)} icon={<Clock className="h-4 w-4" />} hint="DRAFT + APPROVED" />
          </div>
        )
      )}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">Por canal</h2>
        </div>
        {porCanal.length === 0 && !loading ? (
          <p className="text-[13px] text-neutral-500">Sin publicaciones en la cola todavía.</p>
        ) : (
          <div className="space-y-2.5">
            {porCanal.map((c) => (
              <div
                key={c.canal}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border-subtle bg-panel/60 px-4 py-3"
              >
                <Badge className={badgeClase(c.canal)}>{c.canal}</Badge>
                <span className="text-[12px] text-neutral-400">
                  <b className="text-white">{fmt(c.total)}</b> total
                </span>
                <span className="text-[12px] text-neutral-400">
                  <b className="text-emerald-300">{fmt(c.publicadas)}</b> ok
                </span>
                <span className="text-[12px] text-neutral-400">
                  <b className="text-red-300">{fmt(c.fallidas)}</b> fail
                </span>
                <span className="text-[12px] text-neutral-400">
                  <b className="text-amber-300">{fmt(c.pendientes)}</b> pend
                </span>
                <span className="ml-auto flex items-center gap-3 text-[12px] text-neutral-400">
                  {typeof c.tasaExito === 'number' && (
                    <span>
                      <Star className="mr-1 inline h-3 w-3 text-primary" />
                      <b className="text-white">{Math.round(c.tasaExito * 100)}%</b> éxito
                    </span>
                  )}
                  {typeof c.scorePromedio === 'number' && (
                    <span>
                      <Star className="mr-1 inline h-3 w-3 text-amber-300" />
                      <b className="text-white">{c.scorePromedio}</b> media score
                    </span>
                  )}
                  {typeof c.vistasReales === 'number' && (
                    <span className="text-primary">
                      <Eye className="mr-1 inline h-3 w-3" />
                      <b>{fmt(c.vistasReales)}</b> vistas reales
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
            Analytics reales por API
          </h2>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-[11px] text-neutral-500">Plataforma</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as (typeof PLATFORMS)[number])}
              className="h-9 rounded-md border border-border-subtle bg-input-active px-2.5 text-[13px] text-white outline-none focus:border-primary/60"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-neutral-500">Channel ID (solo youtube)</span>
            <Input
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="UCxxxxxxxxxxxxxxxxxxxx"
              className="w-64"
            />
          </label>
          <Button onClick={() => void loadAnalytics()} disabled={analyticsLoading}>
            {analyticsLoading ? 'Consultando…' : 'Consultar analytics'}
          </Button>
        </div>

        {analyticsError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[12.5px] text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b className="font-semibold">fail-soft:</b> {analyticsError}. Configura la clave/permiso correspondiente
              (YOUTUBE_API_KEY gratis; resto requiere aprobación/OAuth/token).
            </span>
          </div>
        )}

        {analytics?.ok && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {typeof analytics.vistas === 'number' && (
              <StatCard label="Vistas" value={fmt(analytics.vistas)} icon={<Eye className="h-4 w-4" />} hint={analytics.canal ?? undefined} />
            )}
            {typeof analytics.subscriptores === 'number' && (
              <StatCard label="Subscriptores" value={fmt(analytics.subscriptores)} icon={<Users className="h-4 w-4" />} hint="YouTube" />
            )}
            {typeof analytics.videoCount === 'number' && (
              <StatCard label="Videos" value={fmt(analytics.videoCount)} icon={<Video className="h-4 w-4" />} hint="en el canal" />
            )}
            {typeof analytics.likes === 'number' && (
              <StatCard label="Likes" value={fmt(analytics.likes)} icon={<TrendingUp className="h-4 w-4" />} />
            )}
            {analytics.canal && (
              <div className="flex items-center gap-2 text-[12px] text-neutral-500">
                <ExternalLink className="h-3.5 w-3.5" /> fusionado en la fila <Badge className={badgeClase(analytics.canal)}>{analytics.canal}</Badge>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}