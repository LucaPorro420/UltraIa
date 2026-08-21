/**
 * recorder.ts — Media Automation: control de grabación.
 *
 * Port ORIGINAL de los PRINCIPIOS de media automation (fuente: enlaces.txt →
 * learning/sources/media-automation.md, docs/RAZONAMIENTO-MEDIA-AUTOMATION.md).
 * Nada de código copiado; solo el patrón de producción: OBS Studio como motor de
 * captura + WebSocket v5 como control remoto + degradación keyless a ffmpeg
 * gdigrab cuando no hay OBS (Windows).
 *
 * Keyless-first: el planificador es determinista; la conexión real la ejecuta el
 * runner (nunca los tests). Los tests usan un FakeWebSocket global.
 */

/** OBS WebSocket v5 request status: OK (op 7 RequestStatus). */
export const OBS_REQUEST_OK = 100;

/** URL por defecto del servidor obs-websocket (plugin incluido en OBS 28+). */
export const OBS_DEFAULT_URL = 'ws://127.0.0.1:4455';

/** Comandos de grabación soportados por planRecording(). */
export const OBS_COMMANDS = ['start', 'stop', 'pause', 'resume', 'status', 'scene'] as const;
export type ObsCommand = (typeof OBS_COMMANDS)[number];

/** Op 0: StartRecord. Op 1: StopRecord. Op 2: PauseRecord. Op 6: GetRecordStatus. Op 7: GetCurrentProgramScene. */
export const OBS_OP: Record<ObsCommand, number> = {
  start: 0,
  stop: 1,
  pause: 2,
  resume: 3,
  status: 6,
  scene: 7,
};

export interface ObsRecorderOptions {
  /** ws:// URL del obs-websocket. */
  url?: string;
  /** Autenticación (obs-websocket v5 usa password; sin ella el server no responde). */
  password?: string;
  /** Timeout de conexión (ms). Default 5000 — igual al testTimeout de vitest. */
  connectTimeoutMs?: number;
}

export interface ObsRequest {
  op: number;
  d: {
    requestType?: string;
    requestId?: string;
    requestData?: Record<string, unknown>;
  };
}

export interface ObsResponse {
  op: number;
  d: {
    requestType?: string;
    requestId?: string;
    requestStatus?: { code: number; result: boolean; comment?: string };
    responseData?: Record<string, unknown>;
    sessionId?: string;
  };
}

export interface ObsRecorder {
  readonly url: string;
  readonly readyState: number;
  connect(): Promise<void>;
  sendRequest(requestType: string, requestData?: Record<string, unknown>): Promise<ObsResponse>;
  close(): void;
}

/** WebSocket global de Node 22+; en browsers existe nativamente. */
type WsCtor = typeof WebSocket;

/** Se lee en RUNTIME (no en module load) para que los tests puedan inyectar
 *  un FakeWebSocket con vi.stubGlobal y para reflejar el runtime actual. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wsCtor(): WsCtor | undefined {
  return (globalThis as any).WebSocket as WsCtor | undefined;
}

/**
 * Crea el cliente OBS WebSocket v5 (op 1 Identify / op 6 Request).
 * La conexión real solo ocurre en runtime; los tests inyectan un FakeWebSocket.
 */
export function createObsRecorder(options: ObsRecorderOptions = {}): ObsRecorder {
  const url = options.url ?? OBS_DEFAULT_URL;
  const connectTimeoutMs = options.connectTimeoutMs ?? 5000;
  const Ctor: WsCtor | undefined = wsCtor();
  if (!Ctor) {
    throw new Error(
      'No WebSocket global disponible (Node >= 22 o navegador requerido). Usar planRecording() para el plan ffmpeg.',
    );
  }

  let ws: InstanceType<WsCtor> | null = null;
  let readyState = 0; // CONNECTING
  let requestSeq = 0;

  const pending = new Map<string, { resolve: (r: ObsResponse) => void; reject: (e: Error) => void }>();

  function onMessage(raw: unknown): void {
    let msg: ObsResponse;
    try {
      msg = JSON.parse(String(raw)) as ObsResponse;
    } catch {
      return;
    }
    if (msg.op === 7 && msg.d?.requestId && pending.has(msg.d.requestId)) {
      const p = pending.get(msg.d.requestId);
      pending.delete(msg.d.requestId);
      p?.resolve(msg);
    }
  }

  return {
    url,
    get readyState(): number {
      return readyState;
    },
    connect(): Promise<void> {
      if (ws) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const socket = new Ctor(url);
        ws = socket;
        const timer = setTimeout(() => {
          socket.close();
          reject(new Error(`connect timeout ${connectTimeoutMs}ms a ${url}`));
        }, connectTimeoutMs);
        socket.addEventListener('open', () => {
          readyState = 1; // OPEN
          clearTimeout(timer);
          // op 1 Identify (v5): rpcVersion 1 + password opcional.
          const identify: ObsRequest = {
            op: 1,
            d: {
              requestType: 'Identify',
              requestData: { rpcVersion: 1, ...(options.password ? { authentication: options.password } : {}) },
            },
          };
          socket.send(JSON.stringify(identify));
          resolve();
        });
        socket.addEventListener('message', (ev: MessageEvent) => onMessage(ev.data));
        socket.addEventListener('close', () => {
          readyState = 3; // CLOSED
          for (const p of pending.values()) p.reject(new Error('conexión OBS cerrada'));
          pending.clear();
        });
        socket.addEventListener('error', () => {
          /* close() disparará el reject de los pendings */
        });
      });
    },
    sendRequest(requestType: string, requestData?: Record<string, unknown>): Promise<ObsResponse> {
      if (!ws || readyState !== 1) {
        return Promise.reject(new Error('not connected'));
      }
      const requestId = `req-${++requestSeq}-${Date.now()}`;
      const msg: ObsRequest = { op: 6, d: { requestType, requestId, requestData } };
      return new Promise<ObsResponse>((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        ws?.send(JSON.stringify(msg));
      });
    },
    close(): void {
      // Rechazar pendings PRIMERO (mensaje determinista 'closed'): el cierre del
      // socket (ws.close) dispara el listener 'close' que también los rechazaría
      // con 'conexión OBS cerrada' (mensaje del cierre EXTERNO).
      for (const p of pending.values()) p.reject(new Error('closed'));
      pending.clear();
      if (ws) {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
      ws = null;
      readyState = 3;
    },
  };
}

/** Plan de grabación: o bien OBS (ws) o bien ffmpeg gdigrab (fallback keyless). */
export interface RecordingPlan {
  mode: 'obs' | 'ffmpeg';
  command: ObsCommand;
  obs?: { url: string; op: number; requestType: string; requestData?: Record<string, unknown> };
  ffmpeg?: { argv: string[]; note: string };
}

export interface GdigrabOptions {
  outFile?: string;
  fps?: number;
  region?: string;
  audioDevice?: string;
  segmentSec?: number;
}

/** ffmpeg gdigrab (Windows) determinista: segmentado, CRF 18, pista de silencio fallback. */
export function ffmpegGdigrabCommand(options: GdigrabOptions = {}): string[] {
  const outFile = options.outFile ?? 'rec_%03d.mp4';
  const fps = options.fps ?? 30;
  const segmentSec = options.segmentSec ?? 60;
  const argv = [
    '-y',
    '-f', 'gdigrab',
    '-framerate', String(fps),
  ];
  if (options.region) argv.push('-video_size', options.region);
  argv.push('-i', 'desktop');
  if (options.audioDevice) {
    argv.push('-f', 'dshow', '-i', `audio=${options.audioDevice}`);
  } else {
    // pista de silencio fallback (evita videos sin audio)
    argv.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
  }
  argv.push(
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '128k',
    '-f', 'segment', '-segment_time', String(segmentSec), '-reset_timestamps', '1',
    outFile,
  );
  return argv;
}

/**
 * Plan determinista de grabación: OBS primero (webSocket), ffmpeg gdigrab como
 * fallback documentado. Nunca abre conexiones — solo describe el plan.
 */
export function planRecording(command: ObsCommand, options: { url?: string } = {}): RecordingPlan {
  const op = OBS_OP[command];
  const url = options.url ?? OBS_DEFAULT_URL;
  const requestType = command === 'start' ? 'StartRecord'
    : command === 'stop' ? 'StopRecord'
    : command === 'pause' ? 'PauseRecord'
    : command === 'resume' ? 'ResumeRecord'
    : command === 'status' ? 'GetRecordStatus'
    : 'GetCurrentProgramScene';
  const requestData =
    command === 'scene' ? { sceneName: 'Escena 1' } : undefined;

  const ffmpeg = ffmpegGdigrabCommand();
  return {
    mode: 'obs',
    command,
    obs: { url, op, requestType, requestData },
    ffmpeg: { argv: ffmpeg, note: 'fallback si OBS no responde' },
  };
}

/** Resumen humano del plan (determinista, sin conexión). */
export function describePlan(plan: RecordingPlan): string {
  if (plan.mode === 'obs' && plan.obs) {
    const lines = [
      `OBS ${plan.command} (op ${plan.obs.op} ${plan.obs.requestType})`,
      `  ws: ${plan.obs.url}`,
      `  requestData: ${JSON.stringify(plan.obs.requestData ?? {})}`,
    ];
    if (plan.ffmpeg) {
      lines.push(`  fallback ffmpeg: ${plan.ffmpeg.argv.join(' ')}`);
    }
    return lines.join('\n');
  }
  return `ffmpeg ${plan.command}: ${plan.ffmpeg?.argv.join(' ') ?? ''}`;
}