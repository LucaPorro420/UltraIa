'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  RefreshCcw,
  Trash2,
  XCircle,
  Share2,
  MessagesSquare,
  Wallet,
  GitBranch,
  Sparkles,
  Clapperboard,
  Search,
  Cloud,
  BarChart3,
  Workflow,
  CircleDot,
} from 'lucide-react';
import type {
  CatalogEntry,
  ConnectionState as CatStatus,
  CatalogCategoryMeta,
  ConnectionCategory,
} from '@ultraia/core';

interface ConnectionGroup {
  category: ConnectionCategory;
  meta: CatalogCategoryMeta;
  entries: CatalogEntry[];
}

/**
 * Conexiones (F4 del IDE V0.1) — Centro de integraciones del proyecto.
 * Catálogo completo (social, IA, nube, monetización, …) agrupado por categoría,
 * con estado y, para los canales sociales, gestión de claves cifradas + 2FA por mail.
 */

interface ConnectionStatusDTO {
  canal: string;
  fuente: 'db' | 'env' | 'none';
  conectado: boolean;
  last4?: string;
  expiresAt: string | null;
  estado?: string;
  ultimoTestAt: string | null;
  ultimoError?: string | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Share2,
  MessagesSquare,
  Wallet,
  Mail,
  GitBranch,
  Sparkles,
  Clapperboard,
  Search,
  Cloud,
  BarChart3,
  Workflow,
};

const STATUS_META: Record<CatStatus, { label: string; cls: string; dot: string }> = {
  connected: { label: 'Conectado', cls: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300', dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]' },
  keyless: { label: 'Sin clave', cls: 'border-primary/40 bg-primary/10 text-primary', dot: 'bg-primary shadow-[0_0_8px_rgba(139,92,246,0.7)]' },
  available: { label: 'Disponible', cls: 'border-amber-800/40 bg-amber-950/20 text-amber-300', dot: 'bg-amber-400' },
  planned: { label: 'Próximamente', cls: 'border-border-subtle bg-panel/40 text-neutral-400', dot: 'bg-neutral-600' },
};

function fmtFecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ConnectionsClient({
  groups,
  initialConnections,
  isAdmin,
  ephemeral,
}: {
  groups: ConnectionGroup[];
  initialConnections: ConnectionStatusDTO[];
  isAdmin: boolean;
  ephemeral: boolean;
}) {
  const [connections, setConnections] = useState<ConnectionStatusDTO[]>(initialConnections);
  const [tokenDrafts, setTokenDrafts] = useState<Record<string, string>>({});
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  const [codeSent, setCodeSent] = useState<Record<string, boolean>>({});
  const [busyCanal, setBusyCanal] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ canal: string; kind: 'ok' | 'err'; text: string } | null>(
    null,
  );

  const byCanal = useMemo(() => {
    const map = new Map<string, ConnectionStatusDTO>();
    for (const c of connections) map.set(c.canal, c);
    return map;
  }, [connections]);

  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  const activas = groups
    .flatMap((g) => g.entries)
    .filter((e) => e.status === 'connected' || e.status === 'keyless').length;

  const refresh = useCallback(async () => {
    const res = await fetch('/api/connections');
    if (!res.ok) return;
    const data = (await res.json()) as { connections: ConnectionStatusDTO[] };
    setConnections(
      data.connections.map((c) => ({
        ...c,
        expiresAt: c.expiresAt ?? null,
        ultimoTestAt: c.ultimoTestAt ?? null,
      })),
    );
  }, []);

  const guardarToken = useCallback(
    async (canal: string) => {
      const token = (tokenDrafts[canal] ?? '').trim();
      if (token.length < 8) {
        setNotice({ canal, kind: 'err', text: 'El token parece demasiado corto.' });
        return;
      }
      const code = (codeDrafts[canal] ?? '').trim();
      if (code.length < 4) {
        setNotice({ canal, kind: 'err', text: 'Introduce el código de 6 dígitos enviado a tu email.' });
        return;
      }
      setBusyCanal(canal);
      try {
        const res = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canal, token, code }),
        });
        if (res.ok) {
          setNotice({
            canal,
            kind: 'ok',
            text: 'Token guardado (cifrado) tras verificar el código. Pulsa Probar para verificarlo.',
          });
          setTokenDrafts((d) => ({ ...d, [canal]: '' }));
          setCodeDrafts((d) => ({ ...d, [canal]: '' }));
          setCodeSent((d) => ({ ...d, [canal]: false }));
          await refresh();
        } else {
          const data = (await res.json().catch(() => null)) as { reason?: string; error?: string } | null;
          const reason = data?.reason;
          const detail = reason
            ? reason === 'expired'
              ? 'expirado'
              : reason === 'invalid'
                ? 'incorrecto'
                : reason === 'not_found'
                  ? 'no solicitado (pulsa "Enviar código")'
                  : 'rechazado'
            : data?.error ?? (await res.text());
          setNotice({ canal, kind: 'err', text: `No se pudo guardar (${res.status}): ${detail}` });
        }
      } finally {
        setBusyCanal(null);
      }
    },
    [tokenDrafts, codeDrafts, refresh],
  );

  const enviarCodigo = useCallback(async (canal: string) => {
    setBusyCanal(canal);
    try {
      const res = await fetch('/api/connections/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal }),
      });
      if (res.ok) {
        setCodeSent((d) => ({ ...d, [canal]: true }));
        setNotice({
          canal,
          kind: 'ok',
          text: 'Código enviado a tu email. Introdúcelo (6 dígitos) y pulsa Guardar.',
        });
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setNotice({
          canal,
          kind: 'err',
          text: `No se pudo enviar el código (${res.status}): ${data?.error ?? ''}`,
        });
      }
    } finally {
      setBusyCanal(null);
    }
  }, []);

  const probar = useCallback(
    async (canal: string) => {
      setBusyCanal(canal);
      try {
        const res = await fetch('/api/connections/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ canal }),
        });
        const data = (await res.json()) as { ok?: boolean; reason?: string };
        if (data.ok) {
          setNotice({ canal, kind: 'ok', text: 'Conexión verificada.' });
        } else {
          setNotice({ canal, kind: 'err', text: data.reason ?? 'La prueba falló.' });
        }
        await refresh();
      } finally {
        setBusyCanal(null);
      }
    },
    [refresh],
  );

  const eliminar = useCallback(
    async (canal: string) => {
      setBusyCanal(canal);
      try {
        const res = await fetch(`/api/connections?canal=${encodeURIComponent(canal)}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setNotice({ canal, kind: 'ok', text: 'Conexión eliminada.' });
          await refresh();
        } else {
          setNotice({ canal, kind: 'err', text: `No se pudo eliminar (${res.status}).` });
        }
      } finally {
        setBusyCanal(null);
      }
    },
    [refresh],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Conexiones</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Centro de integraciones del proyecto — {activas} de {total} disponibles
            (conectadas o sin clave). Las claves quedan cifradas y nunca se muestran completas.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-panel px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors duration-150 hover:bg-panel-hover"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      <p className="rounded-lg border border-border-subtle bg-panel/60 px-4 py-2 text-[11px] text-neutral-400">
        Seguridad: guardar una conexión de canal exige un código de 6 dígitos enviado a tu email
        (método &ldquo;código vía mail&rdquo;). Pulsa &ldquo;Enviar código&rdquo;, introdúcelo y luego
        Guardar. Las entradas &ldquo;Sin clave&rdquo; funcionan sin configuración (keyless-first).
      </p>

      {!isAdmin && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-xs text-amber-300">
          Modo solo lectura: gestionar claves requiere cuenta de administrador.
        </p>
      )}
      {ephemeral && (
        <p className="rounded-lg border border-border-subtle bg-panel/60 px-4 py-3 text-xs text-neutral-400">
          Aviso: no hay clave maestra configurada (<code className="font-mono">CONNECTIONS_SECRET</code>),
          así que los tokens guardados no sobreviven un reinicio. Configúrala para persistencia
          completa.
        </p>
      )}

      {groups.map((group) => {
        const Icon = ICONS[group.meta.icon] ?? CircleDot;
        return (
          <section key={group.category} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-1.5">
              <Icon className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-neutral-300">
                {group.meta.label}
              </h2>
              <span className="ml-1 rounded border border-border-subtle bg-input-active px-1.5 py-0.5 text-[10px] text-neutral-500">
                {group.entries.length}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">{group.meta.description}</p>

            <div className="grid gap-3 md:grid-cols-2">
              {group.entries.map((entry) =>
                entry.channel ? (
                  <ChannelCard
                    key={entry.id}
                    entry={entry}
                    conn={byCanal.get(entry.channel)}
                    busy={busyCanal === entry.id}
                    tokenDrafts={tokenDrafts}
                    codeDrafts={codeDrafts}
                    codeSent={codeSent}
                    notice={notice}
                    isAdmin={isAdmin}
                    setTokenDrafts={setTokenDrafts}
                    setCodeDrafts={setCodeDrafts}
                    onGuardar={() => guardarToken(entry.channel!)}
                    onEnviar={() => enviarCodigo(entry.channel!)}
                    onProbar={() => probar(entry.channel!)}
                    onEliminar={() => eliminar(entry.channel!)}
                  />
                ) : (
                  <StatusCard key={entry.id} entry={entry} />
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ChannelCard({
  entry,
  conn,
  busy,
  tokenDrafts,
  codeDrafts,
  codeSent,
  notice,
  isAdmin,
  setTokenDrafts,
  setCodeDrafts,
  onGuardar,
  onEnviar,
  onProbar,
  onEliminar,
}: {
  entry: CatalogEntry;
  conn: ConnectionStatusDTO | undefined;
  busy: boolean;
  tokenDrafts: Record<string, string>;
  codeDrafts: Record<string, string>;
  codeSent: Record<string, boolean>;
  notice: { canal: string; kind: 'ok' | 'err'; text: string } | null;
  isAdmin: boolean;
  setTokenDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCodeDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onGuardar: () => void;
  onEnviar: () => void;
  onProbar: () => void;
  onEliminar: () => void;
}) {
  const st = STATUS_META[entry.status];
  const canal = entry.channel!;
  return (
    <div className="glass-panel card-glow-hover flex flex-col gap-2.5 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
        <span className="font-display text-sm font-semibold text-neutral-100">{entry.label}</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${st.cls}`}>
          {st.label}
        </span>
        {conn?.last4 && <span className="font-mono text-[10px] text-neutral-500">{conn.last4}</span>}
      </div>

      <p className="text-[11px] text-neutral-500">{entry.description}</p>

      {conn?.ultimoError && (
        <p className="truncate rounded border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono text-[10px] text-red-300">
          {conn.ultimoError}
        </p>
      )}

      <p className="font-mono text-[10px] text-neutral-600">
        último test: {fmtFecha(conn?.ultimoTestAt ?? null)} · expira:{' '}
        {conn?.expiresAt ? fmtFecha(conn.expiresAt) : '—'}
      </p>

      {isAdmin && (
        <>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={tokenDrafts[canal] ?? ''}
              onChange={(e) => setTokenDrafts((d) => ({ ...d, [canal]: e.target.value }))}
              placeholder="Pega tu clave aquí…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-md border border-border-muted bg-input-active px-2.5 py-1.5 font-mono text-[11px] text-neutral-100 outline-none transition-colors duration-150 placeholder:text-neutral-600 focus:border-border-active"
            />
            <button
              type="button"
              disabled={busy}
              onClick={onGuardar}
              title="Guardar token cifrado"
              className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Guardar
            </button>
            <button
              type="button"
              disabled={busy || !conn}
              onClick={onProbar}
              title="Probar conexión"
              className="flex items-center gap-1 rounded-md border border-border-subtle bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 transition-colors duration-150 hover:bg-panel-hover disabled:opacity-40"
            >
              <PlugZap className="h-3.5 w-3.5" /> Probar
            </button>
            {conn?.fuente === 'db' && (
              <button
                type="button"
                disabled={busy}
                onClick={onEliminar}
                title="Eliminar conexión guardada"
                className="flex items-center gap-1 rounded-md border border-border-subtle bg-panel px-2 py-1.5 text-[11px] text-neutral-400 transition-colors duration-150 hover:border-destructive/50 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onEnviar}
              className="flex items-center gap-1 rounded-md border border-border-subtle bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 transition-colors duration-150 hover:bg-panel-hover disabled:opacity-40"
            >
              <Mail className="h-3.5 w-3.5" /> Enviar código
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={codeDrafts[canal] ?? ''}
              onChange={(e) => setCodeDrafts((d) => ({ ...d, [canal]: e.target.value }))}
              placeholder="Código (6 dígitos)"
              autoComplete="one-time-code"
              className="w-40 rounded-md border border-border-muted bg-input-active px-2.5 py-1.5 font-mono text-[11px] text-neutral-100 outline-none transition-colors duration-150 placeholder:text-neutral-600 focus:border-border-active"
            />
            {codeSent[canal] && <span className="text-[10px] text-emerald-400">código enviado</span>}
          </div>
        </>
      )}

      {notice?.canal === canal && (
        <p
          className={`flex items-start gap-1.5 rounded px-2 py-1 text-[11px] ${
            notice.kind === 'ok' ? 'bg-emerald-950/40 text-emerald-300' : 'bg-red-950/40 text-red-300'
          }`}
        >
          {notice.kind === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" />
          ) : (
            <XCircle className="mt-0.5 h-3 w-3 shrink-0" />
          )}
          {notice.text}
        </p>
      )}
    </div>
  );
}

function StatusCard({ entry }: { entry: CatalogEntry }) {
  const st = STATUS_META[entry.status];
  return (
    <div className="glass-panel flex flex-col gap-2.5 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
        <span className="font-display text-sm font-semibold text-neutral-100">{entry.label}</span>
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-widest ${st.cls}`}>
          {st.label}
        </span>
      </div>

      <p className="text-[11px] text-neutral-500">{entry.description}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
        {entry.status === 'keyless' && <span className="text-primary">Funciona sin configuración.</span>}
        {entry.status === 'connected' && entry.envVars && (
          <span className="font-mono">vía {entry.envVars.join(', ')}</span>
        )}
        {entry.status === 'available' && entry.envVars && (
          <span className="font-mono">Configura: {entry.envVars.join(', ')}</span>
        )}
        {entry.status === 'planned' && <span>Previsto para el roadmap.</span>}
        {entry.docsUrl && (
          <a
            href={entry.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-primary hover:underline"
          >
            Obtener clave <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
