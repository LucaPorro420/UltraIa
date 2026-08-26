'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  PlugZap,
  RefreshCcw,
  Trash2,
  XCircle,
} from 'lucide-react';

/**
 * Conexiones (F4 del IDE V0.1) — gestión de canales desde la interfaz.
 * Los tokens se guardan cifrados en la base de datos; la UI solo ve máscaras.
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

const CANAL_META: Record<string, { label: string; hint: string }> = {
  youtube_shorts: { label: 'YouTube Shorts', hint: 'OAuth del canal (access token)' },
  tiktok: { label: 'TikTok', hint: 'Content Posting API (access token)' },
  x: { label: 'X', hint: 'OAuth 2.0 user token' },
  instagram: { label: 'Instagram Reels', hint: 'Graph API token + IG_USER_ID en meta' },
  threads: { label: 'Threads', hint: 'Graph API token + THREADS_USER_ID en meta' },
  facebook: { label: 'Facebook Pages', hint: 'Page access token' },
  linkedin: { label: 'LinkedIn', hint: 'Access token de organización o miembro' },
  telegram: { label: 'Telegram', hint: 'Bot token (@BotFather)' },
  discord: { label: 'Discord', hint: 'Webhook URL completa' },
  slack: { label: 'Slack', hint: 'Bot token (xoxb-)' },
};

const TODOS_LOS_CANALES = Object.keys(CANAL_META);

function fmtFecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function ConnectionsClient({
  initialConnections,
  isAdmin,
  ephemeral,
}: {
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

  const conectados = connections.filter((c) => c.conectado).length;

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

  const guardarToken = useCallback(async (canal: string) => {
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
        const data = (await res.json().catch(() => null)) as {
          reason?: string;
          error?: string;
        } | null;
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
  }, [tokenDrafts, codeDrafts, refresh]);

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

  const probar = useCallback(async (canal: string) => {
    setBusyCanal(canal);
    try {
      const res = await fetch('/api/connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canal }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };
      if (data.ok) {
        setNotice({
          canal,
          kind: 'ok',
          text: `Conexión verificada${data.reason ? '' : '.'}`,
        });
      } else {
        setNotice({ canal, kind: 'err', text: data.reason ?? 'La prueba falló.' });
      }
      await refresh();
    } finally {
      setBusyCanal(null);
    }
  }, [refresh]);

  const eliminar = useCallback(async (canal: string) => {
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
  }, [refresh]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[22px] font-bold tracking-tight">Conexiones</h1>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {conectados} de {TODOS_LOS_CANALES.length} canales conectados · tus claves quedan
            cifradas y nunca se muestran completas.
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
        Seguridad: guardar una conexión exige un código de 6 dígitos enviado a tu email
        (método &ldquo;código vía mail&rdquo;). Pulsa &ldquo;Enviar código&rdquo;, introdúcelo y
        luego Guardar.
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

      <div className="grid gap-3 md:grid-cols-2">
        {TODOS_LOS_CANALES.map((canal) => {
          const conn = byCanal.get(canal);
          const meta = CANAL_META[canal];
          const busy = busyCanal === canal;
          const dotClass = !conn
            ? 'bg-neutral-600'
            : conn.conectado
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]'
              : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]';
          return (
            <div
              key={canal}
              className="glass-panel card-glow-hover flex flex-col gap-2.5 rounded-xl p-4"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                <span className="font-display text-sm font-semibold text-neutral-100">
                  {meta.label}
                </span>
                {conn && (
                  <span className="rounded border border-border-subtle bg-input-active px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                    {conn.fuente === 'db' ? 'guardada' : 'entorno'}
                  </span>
                )}
                {conn?.last4 && (
                  <span className="font-mono text-[10px] text-neutral-500">{conn.last4}</span>
                )}
              </div>

              <p className="text-[11px] text-neutral-500">{meta.hint}</p>

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
                    onChange={(e) =>
                      setTokenDrafts((d) => ({ ...d, [canal]: e.target.value }))
                    }
                    placeholder="Pega tu clave aquí…"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-md border border-border-muted bg-input-active px-2.5 py-1.5 font-mono text-[11px] text-neutral-100 outline-none transition-colors duration-150 placeholder:text-neutral-600 focus:border-border-active"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => guardarToken(canal)}
                    title="Guardar token cifrado"
                    className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-primary/85 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    Guardar
                  </button>
                  <button
                    type="button"
                    disabled={busy || !conn}
                    onClick={() => probar(canal)}
                    title="Probar conexión"
                    className="flex items-center gap-1 rounded-md border border-border-subtle bg-panel px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 transition-colors duration-150 hover:bg-panel-hover disabled:opacity-40"
                  >
                    <PlugZap className="h-3.5 w-3.5" /> Probar
                  </button>
                  {conn?.fuente === 'db' && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => eliminar(canal)}
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
                    onClick={() => enviarCodigo(canal)}
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
                  {codeSent[canal] && (
                    <span className="text-[10px] text-emerald-400">código enviado</span>
                  )}
                </div>
                </>
              )}

              {notice?.canal === canal && (
                <p
                  className={`flex items-start gap-1.5 rounded px-2 py-1 text-[11px] ${
                    notice.kind === 'ok'
                      ? 'bg-emerald-950/40 text-emerald-300'
                      : 'bg-red-950/40 text-red-300'
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
        })}
      </div>
    </div>
  );
}
