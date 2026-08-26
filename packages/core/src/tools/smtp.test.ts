/**
 * smtp.test.ts — Verifica el diálogo SMTP completo con un transporte inyectado
 * (sin red). Cubre: TLS implícito (465), STARTTLS (587), fallo de auth y fallback.
 */
import { describe, it, expect } from 'vitest';
import { createSmtpEmailSender, type SmtpTransport, type SmtpTransportFactory } from './smtp';
import { createEnvEmailSender } from './emailCode';

type ScriptLine = { code: number; lines?: string[] };
interface Sink {
  commands: string[];
  i: number;
  upgraded: boolean;
}

function scriptedFactory(script: ScriptLine[], sink: Sink): SmtpTransportFactory {
  return async (): Promise<SmtpTransport> => ({
    read() {
      const r = script[sink.i++] ?? { code: 250, lines: ['250 ok'] };
      return Promise.resolve({ code: r.code, lines: r.lines ?? [`${r.code} ok`] });
    },
    command(line: string) {
      sink.commands.push(line);
      const r = script[sink.i++] ?? { code: 250, lines: ['250 ok'] };
      return Promise.resolve({ code: r.code, lines: r.lines ?? [`${r.code} ok`] });
    },
    startTls() {
      sink.upgraded = true;
      return Promise.resolve();
    },
    close() {
      /* noop */
    },
  });
}

const BASE465: ScriptLine[] = [
  { code: 220, lines: ['220 smtp ready'] },
  { code: 250, lines: ['250 ok'] },
  { code: 334, lines: ['334 VXNlcm5hbWU6'] },
  { code: 334, lines: ['334 UGFzc3dvcmQ6'] },
  { code: 235, lines: ['235 authenticated'] },
  { code: 250 },
  { code: 250 },
  { code: 354 },
  { code: 250 },
  { code: 221 },
];

describe('createSmtpEmailSender', () => {
  it('ejecuta el diálogo SMTP sobre TLS implícito (465) y envía el mensaje', async () => {
    const sink: Sink = { commands: [], i: 0, upgraded: false };
    const sender = await createSmtpEmailSender({
      host: 'smtp.test',
      port: 465,
      user: 'u',
      pass: 'p',
      from: 'n@x.io',
      transportFactory: scriptedFactory(BASE465, sink),
    });
    const res = await sender.send({ to: 'a@b.com', subject: 'Hola', body: 'codigo 123' });

    expect(res.ok).toBe(true);
    expect(sink.commands[0]).toMatch(/^EHLO /);
    expect(sink.commands[1]).toBe('AUTH LOGIN');
    expect(sink.commands[2]).toBe(Buffer.from('u').toString('base64'));
    expect(sink.commands[3]).toBe(Buffer.from('p').toString('base64'));
    expect(sink.commands[4]).toBe('MAIL FROM:<n@x.io>');
    expect(sink.commands[5]).toBe('RCPT TO:<a@b.com>');
    expect(sink.commands[6]).toBe('DATA');
    expect(sink.commands[7]).toContain('Subject: Hola');
    expect(sink.commands[7]).toContain('codigo 123');
    expect(sink.commands[7]).toContain('\r\n.');
    expect(sink.commands[8]).toBe('QUIT');
    expect(sink.upgraded).toBe(false);
  });

  it('usa STARTTLS en puerto 587 y actualiza el socket', async () => {
    const script: ScriptLine[] = [
      { code: 220, lines: ['220 smtp ready'] },
      { code: 250, lines: ['250-STARTTLS', '250 ok'] },
      { code: 220, lines: ['220 ready to start TLS'] },
      { code: 250, lines: ['250 ok'] },
      { code: 334 },
      { code: 334 },
      { code: 235 },
      { code: 250 },
      { code: 250 },
      { code: 354 },
      { code: 250 },
      { code: 221 },
    ];
    const sink: Sink = { commands: [], i: 0, upgraded: false };
    const sender = await createSmtpEmailSender({
      host: 'smtp.test',
      port: 587,
      user: 'u',
      pass: 'p',
      from: 'n@x.io',
      transportFactory: scriptedFactory(script, sink),
    });
    const res = await sender.send({ to: 'a@b.com', subject: 'S', body: 'b' });

    expect(res.ok).toBe(true);
    expect(sink.commands[0]).toMatch(/^EHLO /);
    expect(sink.commands[1]).toBe('STARTTLS');
    expect(sink.commands[2]).toMatch(/^EHLO /);
    expect(sink.commands[3]).toBe('AUTH LOGIN');
    expect(sink.upgraded).toBe(true);
  });

  it('falla de forma blanda si la autenticación es rechazada', async () => {
    const script: ScriptLine[] = [
      { code: 220 },
      { code: 250 },
      { code: 334 },
      { code: 334 },
      { code: 535, lines: ['535 auth failed'] },
      { code: 250 },
      { code: 250 },
      { code: 354 },
      { code: 250 },
      { code: 221 },
    ];
    const sink: Sink = { commands: [], i: 0, upgraded: false };
    const sender = await createSmtpEmailSender({
      host: 'smtp.test',
      port: 465,
      user: 'u',
      pass: 'wrong',
      from: 'n@x.io',
      transportFactory: scriptedFactory(script, sink),
    });
    const res = await sender.send({ to: 'a@b.com', subject: 'S', body: 'b' });

    expect(res.ok).toBe(false);
    expect(res.error).toContain('AUTH pass');
  });

  it('lanza si no hay host SMTP', async () => {
    await expect(createSmtpEmailSender({})).rejects.toThrow(/host/i);
  });
});

describe('createEnvEmailSender', () => {
  it('usa SMTP real cuando hay host/user/pass, con transporte inyectado', async () => {
    const sink: Sink = { commands: [], i: 0, upgraded: false };
    const sender = createEnvEmailSender({
      host: 'smtp.test',
      port: 465,
      user: 'u',
      pass: 'p',
      from: 'n@x.io',
      transportFactory: scriptedFactory(BASE465, sink),
    });
    const res = await sender.send({ to: 'a@b.com', subject: 'S', body: 'b' });
    expect(res.ok).toBe(true);
    expect(sink.commands.length).toBeGreaterThan(0);
  });

  it('degrada a console (ok) sin configuración SMTP', async () => {
    const sender = createEnvEmailSender({});
    const res = await sender.send({ to: 'a@b.com', subject: 'S', body: 'b' });
    expect(res.ok).toBe(true);
  });
});
