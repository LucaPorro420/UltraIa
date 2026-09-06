import { describe, expect, it } from 'vitest';
import {
  BROWSER_SESSION_FILE,
  SOCIAL_NETWORKS,
  buildStorageState,
  getNetwork,
  loginGuide,
  planBrowserLogin,
  socialStatus,
  validateSessionCookies,
} from './social-connect';

describe('social-connect', () => {
  it('tiene las 14 redes con adapters de publicación', () => {
    expect(SOCIAL_NETWORKS).toHaveLength(14);
    const ids = SOCIAL_NETWORKS.map((n) => n.id);
    for (const must of ['instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'x', 'telegram']) {
      expect(ids).toContain(must);
    }
    for (const n of SOCIAL_NETWORKS) expect(n.publish).toBe(true);
  });

  it('cada red tiene loginUrl https y al menos una envVar', () => {
    for (const n of SOCIAL_NETWORKS) {
      expect(n.loginUrl.startsWith('https://')).toBe(true);
      expect(n.envVars.length).toBeGreaterThan(0);
    }
  });

  it('status con env vacío: todo desconectado con faltantes', () => {
    const r = socialStatus({});
    expect(r.conectadas).toBe(0);
    expect(r.total).toBe(14);
    expect(r.listasParaPublicar).toEqual([]);
    const tg = r.redes.find((x) => x.id === 'telegram')!;
    expect(tg.connected).toBe(false);
    expect(tg.missing).toEqual(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  });

  it('status conectado cuando el env está completo', () => {
    const r = socialStatus({ TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: 'y' });
    const tg = r.redes.find((x) => x.id === 'telegram')!;
    expect(tg.connected).toBe(true);
    expect(tg.missing).toEqual([]);
    expect(r.listasParaPublicar).toContain('telegram');
  });

  it('status parcial: una var presente, una faltante', () => {
    const r = socialStatus({ IG_ACCESS_TOKEN: 'x' });
    const ig = r.redes.find((x) => x.id === 'instagram')!;
    expect(ig.connected).toBe(false);
    expect(ig.missing).toEqual(['IG_USER_ID']);
  });

  it('status NUNCA expone valores de tokens', () => {
    const r = socialStatus({ X_ACCESS_TOKEN: 'secreto-123' });
    expect(JSON.stringify(r)).not.toContain('secreto-123');
  });

  it('loginGuide instagram incluye Graph + vars + scopes', () => {
    const g = loginGuide('instagram');
    expect(g.ok).toBe(true);
    expect(g.guide!.envVars).toEqual(['IG_ACCESS_TOKEN', 'IG_USER_ID']);
    expect(g.guide!.loginUrl).toContain('developers.facebook.com');
    expect(g.guide!.pasos.join(' ')).toContain('.env LOCAL');
  });

  it('loginGuide telegram es flujo token (BotFather)', () => {
    const g = loginGuide('telegram');
    expect(g.ok).toBe(true);
    expect(g.guide!.auth).toBe('token');
    expect(g.guide!.pasos.join(' ')).toContain('BotFather');
  });

  it('loginGuide red desconocida falla soft con lista válida', () => {
    const g = loginGuide('myspace');
    expect(g.ok).toBe(false);
    expect(g.error!).toContain('instagram');
  });

  it('getNetwork resuelve y undefined si no existe', () => {
    expect(getNetwork('linkedin')!.nombre).toBe('LinkedIn');
    expect(getNetwork('nope')).toBeUndefined();
  });

  it('validateSessionCookies acepta cookies válidas', () => {
    const v = validateSessionCookies([{ domain: 'instagram.com', name: 'sessionid', value: 'abc' }]);
    expect(v.ok).toBe(true);
    expect(v.cookies).toHaveLength(1);
  });

  it('validateSessionCookies rechaza vacío y valores vacíos', () => {
    expect(validateSessionCookies([]).ok).toBe(false);
    expect(validateSessionCookies([{ domain: 'x.com', name: 's', value: '' }]).ok).toBe(false);
  });

  it('validateSessionCookies rechaza dominio corto y cap 200', () => {
    expect(validateSessionCookies([{ domain: 'ab', name: 's', value: 'v' }]).ok).toBe(false);
    const many = Array.from({ length: 201 }, (_, i) => ({ domain: 'x.com', name: `c${i}`, value: 'v' }));
    expect(validateSessionCookies(many).ok).toBe(false);
  });

  it('buildStorageState es determinista y formato Playwright', () => {
    const cookies = [{ domain: 'tiktok.com', name: 'sid', value: 'v1' }];
    const a = buildStorageState(cookies);
    const b = buildStorageState(cookies);
    expect(a).toBe(b);
    const parsed = JSON.parse(a);
    expect(parsed.origins).toEqual([]);
    expect(parsed.cookies[0]).toMatchObject({ name: 'sid', value: 'v1', domain: '.tiktok.com', path: '/', expires: -1, sameSite: 'Lax' });
  });

  it('buildStorageState respeta punto inicial y path/secure dados', () => {
    const s = JSON.parse(buildStorageState([{ domain: '.example.com', name: 'a', value: 'b', path: '/x', secure: false }]));
    expect(s.cookies[0].domain).toBe('.example.com');
    expect(s.cookies[0].path).toBe('/x');
    expect(s.cookies[0].secure).toBe(false);
  });

  it('roundtrip validate → storageState', () => {
    const v = validateSessionCookies([{ domain: 'facebook.com', name: 'c_user', value: '1' }]);
    expect(v.ok).toBe(true);
    const s = JSON.parse(buildStorageState(v.cookies!));
    expect(s.cookies[0].domain).toBe('.facebook.com');
  });

  it('planBrowserLogin linkedin: navigate + espera-humana + verificar', () => {
    const p = planBrowserLogin('linkedin');
    expect(p.ok).toBe(true);
    expect(p.steps!).toHaveLength(3);
    expect(p.steps![0]).toMatchObject({ accion: 'navigate' });
    expect(p.steps![0].url).toContain('linkedin.com');
    expect(p.steps![1].detalle).toContain('HUMANO');
    expect(p.steps![1].detalle).not.toContain('password');
  });

  it('planBrowserLogin red desconocida falla soft', () => {
    expect(planBrowserLogin('nope').ok).toBe(false);
  });

  it('constantes de sesión apuntan a .ultraia (gitignored)', () => {
    expect(BROWSER_SESSION_FILE.startsWith('.ultraia/')).toBe(true);
  });

  it('notas advierten costes/aprobaciones (whatsapp, tiktok)', () => {
    expect(getNetwork('whatsapp')!.notas).toContain('$0.025');
    expect(getNetwork('tiktok')!.notas).toContain('aprobación');
  });

  it('ids de estado coinciden con PublishPlatform del repo', () => {
    const platforms = ['youtube', 'tiktok', 'x', 'instagram', 'threads', 'facebook', 'linkedin', 'telegram', 'discord', 'slack', 'reddit', 'pinterest', 'whatsapp', 'zernio'];
    expect(SOCIAL_NETWORKS.map((n) => n.id).sort()).toEqual(platforms.sort());
  });

  it('ninguna guía pide passwords: todo secreto lo pone el humano en .env LOCAL', () => {
    for (const n of SOCIAL_NETWORKS) {
      const pasos = loginGuide(n.id).guide!.pasos.join(' ');
      expect(pasos).toContain('.env LOCAL');
      expect(pasos.toLowerCase()).not.toContain('password');
    }
  });
});
