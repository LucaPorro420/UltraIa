import { describe, it, expect, vi } from 'vitest';
import {
  generateNumericCode,
  hashCode,
  constantTimeEqual,
  createEmailCode,
  verifyEmailCode,
  InMemoryEmailCodeStore,
  keyFor,
  sendEmailCode,
  EmailPurposeSchema,
  type EmailCodeStore,
  type Clock,
} from './emailCode';

function makeClock(start = 1_000_000): { clock: Clock; advance: (ms: number) => void } {
  let t = start;
  return {
    clock: { now: () => t },
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe('generateNumericCode', () => {
  it('produce longitud y solo dígitos', () => {
    for (const len of [4, 6, 8]) {
      const c = generateNumericCode(len);
      expect(c).toHaveLength(len);
      expect(c).toMatch(/^[0-9]+$/);
    }
  });
  it('es aleatorio (dos generaciones distintas con alta probabilidad)', () => {
    const a = generateNumericCode(8);
    const b = generateNumericCode(8);
    expect(a).not.toEqual(b);
  });
  it('lanza fuera de rango', () => {
    expect(() => generateNumericCode(0)).toThrow();
    expect(() => generateNumericCode(13)).toThrow();
  });
});

describe('hashCode / constantTimeEqual', () => {
  it('hashCode es determinista', () => {
    expect(hashCode('123456')).toEqual(hashCode('123456'));
    expect(hashCode('123456')).not.toEqual(hashCode('123457'));
  });
  it('constantTimeEqual compara contenido', () => {
    expect(constantTimeEqual(hashCode('a'), hashCode('a'))).toBe(true);
    expect(constantTimeEqual(hashCode('a'), hashCode('b'))).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
  });
});

describe('create + verify (happy path)', () => {
  it('verifica un código recién creado', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock } = makeClock();
    const { code } = await createEmailCode({
      email: 'Foo@Ultraia.Local',
      purpose: 'email_verify',
      store,
      clock,
    });
    const res = await verifyEmailCode({
      email: 'foo@ultraia.local', // case-insensitive
      purpose: 'email_verify',
      code,
      store,
      clock,
    });
    expect(res).toEqual({ ok: true });
  });

  it('es single-use: el segundo verify falla', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock } = makeClock();
    const { code } = await createEmailCode({
      email: 'u@x.io',
      purpose: 'email_verify',
      store,
      clock,
    });
    expect((await verifyEmailCode({ email: 'u@x.io', purpose: 'email_verify', code, store, clock })).ok).toBe(true);
    const second = await verifyEmailCode({ email: 'u@x.io', purpose: 'email_verify', code, store, clock });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('not_found');
  });
});

describe('verify rechazos', () => {
  it('código erróneo incrementa intentos y falla', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock } = makeClock();
    const { code } = await createEmailCode({ email: 'u@x.io', purpose: 'login_otp', store, clock });
    const wrong = await verifyEmailCode({ email: 'u@x.io', purpose: 'login_otp', code: '000000', store, clock });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.reason).toBe('invalid');
    // el código correcto sigue funcionando tras un fallo
    const ok = await verifyEmailCode({ email: 'u@x.io', purpose: 'login_otp', code, store, clock });
    expect(ok.ok).toBe(true);
  });

  it('demasiados intentos bloquea (maxAttempts=3)', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock } = makeClock();
    const { code } = await createEmailCode({ email: 'u@x.io', purpose: 'login_otp', store, clock });
    for (let i = 0; i < 3; i++) {
      const r = await verifyEmailCode({ email: 'u@x.io', purpose: 'login_otp', code: '111111', store, clock, maxAttempts: 3 });
      expect(r.ok).toBe(false);
    }
    const blocked = await verifyEmailCode({ email: 'u@x.io', purpose: 'login_otp', code, store, clock, maxAttempts: 3 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.reason).toBe('too_many_attempts');
  });

  it('expirado falla y limpia', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock, advance } = makeClock();
    const { code } = await createEmailCode({ email: 'u@x.io', purpose: 'email_verify', store, clock, ttlMs: 1000 });
    advance(2000);
    const expired = await verifyEmailCode({ email: 'u@x.io', purpose: 'email_verify', code, store, clock });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.reason).toBe('expired');
    // ya no existe tras expiración
    expect(store.get(keyFor('u@x.io', 'email_verify'))).toBeUndefined();
  });

  it('not_found para email/purpose sin código', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock } = makeClock();
    const r = await verifyEmailCode({ email: 'nope@x.io', purpose: 'email_verify', code: '123456', store, clock });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_found');
  });
});

describe('aislamiento por purpose', () => {
  it('mismo email con distinto purpose no colisiona', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock } = makeClock();
    const a = await createEmailCode({ email: 'u@x.io', purpose: 'email_verify', store, clock });
    const b = await createEmailCode({ email: 'u@x.io', purpose: 'connection_2fa', store, clock });
    expect(a.code).not.toEqual(b.code);
    expect((await verifyEmailCode({ email: 'u@x.io', purpose: 'connection_2fa', code: b.code, store, clock })).ok).toBe(true);
    // el de email_verify sigue sin verificar
    expect(store.get(keyFor('u@x.io', 'email_verify'))).toBeDefined();
  });
});

describe('sendEmailCode', () => {
  it('usa el sender inyectado (mock)', async () => {
    const sent = vi.fn(async (_msg: import('./emailCode').EmailMessage) => ({ ok: true }));
    const sender: import('./emailCode').EmailSender = { send: sent };
    const res = await sendEmailCode({ email: 'u@x.io', code: '654321', purpose: 'connection_2fa', sender });
    expect(res.ok).toBe(true);
    expect(sent).toHaveBeenCalledTimes(1);
    const call = sent.mock.calls[0];
    expect(call).toBeDefined();
    const msg = call![0];
    expect(msg.to).toBe('u@x.io');
    expect(msg.body).toContain('654321');
    expect(msg.subject).toContain('seguridad');
  });
});

describe('EmailPurposeSchema', () => {
  it('acepta valores válidos', () => {
    for (const p of ['email_verify', 'connection_2fa', 'login_otp', 'password_reset']) {
      expect(EmailPurposeSchema.parse(p)).toBe(p);
    }
  });
});

describe('InMemoryEmailCodeStore.purge', () => {
  it('elimina expirados', async () => {
    const store = new InMemoryEmailCodeStore();
    const { clock, advance } = makeClock();
    await createEmailCode({ email: 'a@x.io', purpose: 'email_verify', store, clock, ttlMs: 1000 });
    await createEmailCode({ email: 'b@x.io', purpose: 'email_verify', store, clock, ttlMs: 100000 });
    advance(5000);
    store.purge(clock);
    expect(store.get(keyFor('a@x.io', 'email_verify'))).toBeUndefined();
    expect(store.get(keyFor('b@x.io', 'email_verify'))).toBeDefined();
  });
});
