/**
 * smtp.ts — Transporte SMTP real, sin dependencias externas (keyless-first).
 *
 * Implementa el diálogo SMTP (EHLO / STARTTLS / AUTH LOGIN / MAIL / RCPT / DATA)
 * sobre node:net + node:tls, con import dinámico para NO cargar builtins en el
 * bundle de browser/edge. El transporte es inyectable (SmtpTransportFactory) de
 * modo que el diálogo completo es 100% testeable sin red.
 *
 * Solo se usa cuando hay variables SMTP_* (o se pasan opciones). Sin ellas, el
 * sender de emailCode degrada a consola (dev-log).
 */

import type { EmailSender, EmailMessage } from './emailCode';

export interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

export interface SmtpResponse {
  code: number;
  lines: string[];
}

export interface SmtpTransport {
  read(): Promise<SmtpResponse>;
  command(line: string): Promise<SmtpResponse>;
  startTls(host: string): Promise<void>;
  close(): void;
}

export type SmtpTransportFactory = (cfg: SmtpConfig) => Promise<SmtpTransport>;

function codeOf(lines: string[]): number {
  const last = lines[lines.length - 1] ?? '';
  return parseInt(last.slice(0, 3), 10) || 0;
}

/**
 * Transporte sobre un socket real (node net/tls). Acumula respuestas línea a
 * línea y resuelve el waiter cuando llega la última línea de la respuesta
 * (la que tiene un espacio tras el código de 3 dígitos).
 */
export class SocketTransport implements SmtpTransport {
  private socket: any;
  private buf = '';
  private inbox: string[] = [];
  private waiters: Array<(r: SmtpResponse) => void> = [];
  private rejecters: Array<(e: unknown) => void> = [];
  private err: unknown = null;

  constructor(socket: any) {
    this.socket = socket;
    this.attach();
  }

  private attach() {
    this.socket?.setEncoding?.('utf8');
    this.socket?.on?.('data', (d: string) => this.onData(d));
    this.socket?.on?.('error', (e: unknown) => {
      this.err = e;
      while (this.rejecters.length) {
        const rj = this.rejecters.shift();
        const w = this.waiters.shift();
        void w;
        rj?.(e);
      }
    });
  }

  private upgrade(socket: unknown) {
    this.socket?.removeAllListeners?.('data');
    this.socket?.removeAllListeners?.('error');
    this.socket = socket;
    this.attach();
  }

  async startTls(host: string): Promise<void> {
    const tls = await import('node:tls');
    const secured = tls.connect({ socket: this.socket, host });
    this.upgrade(secured);
  }

  private onData(chunk: string) {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf('\r\n')) >= 0) {
      const line = this.buf.slice(0, idx);
      this.buf = this.buf.slice(idx + 2);
      this.inbox.push(line);
      if (line.length >= 4 && line[3] === ' ') {
        const lines = this.inbox;
        this.inbox = [];
        const w = this.waiters.shift();
        this.rejecters.shift();
        w?.({ code: codeOf(lines), lines });
      }
    }
  }

  private next(): Promise<SmtpResponse> {
    const last = this.inbox[this.inbox.length - 1];
    if (this.inbox.length && last && last.length >= 4 && last[3] === ' ') {
      const lines = this.inbox;
      this.inbox = [];
      return Promise.resolve({ code: codeOf(lines), lines });
    }
    return new Promise<SmtpResponse>((resolve, reject) => {
      this.waiters.push(resolve);
      this.rejecters.push(reject);
    });
  }

  read(): Promise<SmtpResponse> {
    if (this.err) return Promise.reject(this.err);
    return this.next();
  }

  command(line: string): Promise<SmtpResponse> {
    if (this.err) return Promise.reject(this.err);
    const p = this.next();
    this.socket.write(line + '\r\n');
    return p;
  }

  close() {
    try {
      this.socket?.end?.();
    } catch {
      /* noop */
    }
  }
}

async function realTransportFactory(cfg: SmtpConfig): Promise<SmtpTransport> {
  const implicitTls = cfg.port === 465;
  if (implicitTls) {
    const tls = await import('node:tls');
    const socket = tls.connect({ host: cfg.host, port: cfg.port });
    return new SocketTransport(socket);
  }
  const net = await import('node:net');
  const socket = net.connect({ host: cfg.host, port: cfg.port });
  return new SocketTransport(socket);
}

/** Crea un EmailSender SMTP real. Falla de forma blanda (ok:false) si hay error. */
export async function createSmtpEmailSender(
  opts: Partial<SmtpConfig> & { transportFactory?: SmtpTransportFactory } = {},
): Promise<EmailSender> {
  const cfg: SmtpConfig = {
    host: opts.host ?? process.env.SMTP_HOST ?? '',
    port: opts.port ?? (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587),
    user: opts.user ?? process.env.SMTP_USER,
    pass: opts.pass ?? process.env.SMTP_PASS,
    from: opts.from ?? process.env.SMTP_FROM ?? 'no-reply@ultraia.local',
  };
  if (!cfg.host) throw new Error('SMTP host requerido');
  const factory = opts.transportFactory ?? realTransportFactory;

  return {
    async send(msg: EmailMessage) {
      let transport: SmtpTransport | undefined;
      try {
        transport = await factory(cfg);
        const greet = await transport.read();
        if (greet.code !== 220) throw new Error(`greeting ${greet.code}`);

        if (cfg.port === 465) {
          const ehlo = await transport.command(`EHLO ${cfg.host}`);
          if (ehlo.code !== 250) throw new Error(`EHLO ${ehlo.code}`);
        } else {
          const ehlo = await transport.command(`EHLO ${cfg.host}`);
          if (ehlo.code !== 250) throw new Error(`EHLO ${ehlo.code}`);
          if (ehlo.lines.some((l) => /STARTTLS/i.test(l))) {
            const st = await transport.command('STARTTLS');
            if (st.code !== 220) throw new Error(`STARTTLS ${st.code}`);
            await transport.startTls(cfg.host);
            const ehlo2 = await transport.command(`EHLO ${cfg.host}`);
            if (ehlo2.code !== 250) throw new Error(`EHLO(tls) ${ehlo2.code}`);
          }
        }

        if (cfg.user && cfg.pass) {
          const a1 = await transport.command('AUTH LOGIN');
          if (a1.code !== 334) throw new Error(`AUTH ${a1.code}`);
          const a2 = await transport.command(Buffer.from(cfg.user).toString('base64'));
          if (a2.code !== 334) throw new Error(`AUTH user ${a2.code}`);
          const a3 = await transport.command(Buffer.from(cfg.pass).toString('base64'));
          if (a3.code !== 235) throw new Error(`AUTH pass ${a3.code}`);
        }

        const mail = await transport.command(`MAIL FROM:<${cfg.from}>`);
        if (mail.code !== 250) throw new Error(`MAIL ${mail.code}`);
        const rcpt = await transport.command(`RCPT TO:<${msg.to}>`);
        if (rcpt.code !== 250) throw new Error(`RCPT ${rcpt.code}`);
        const data = await transport.command('DATA');
        if (data.code !== 354) throw new Error(`DATA ${data.code}`);

        const body =
          `From: ${cfg.from}\r\n` +
          `To: ${msg.to}\r\n` +
          `Subject: ${msg.subject}\r\n` +
          `MIME-Version: 1.0\r\n` +
          `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
          `${msg.body}\r\n.`;

        const sent = await transport.command(body);
        if (sent.code !== 250) throw new Error(`BODY ${sent.code}`);
        await transport.command('QUIT');
        return { ok: true };
      } catch (e: unknown) {
        const err = e instanceof Error ? e.message : String(e);
        return { ok: false, error: err };
      } finally {
        transport?.close();
      }
    },
  };
}
