// -----------------------------------------------------------------------------
// netwatch.test.ts — tests herméticos de la capability `netwatch`.
// CERO red real: los fixtures son salidas crudas capturadas (ES real de esta
// máquina + EN canónico). CERO procesos: sólo argv builders.
// -----------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';

import {
  auditEntryNdjson,
  decideNetAction,
  netshConnectArgv,
  netshDisconnectArgv,
  netshNetworksArgv,
  netshProfilesArgv,
  netshStatusArgv,
  netwatchCronLine,
  netwatchSchtasksArgv,
  parsePingOutput,
  parseWlanInterfaces,
  parseWlanProfiles,
  pingProbeArgv,
  probeSequence,
  resolveNetWatchConfig,
  stripDiacritics,
  wifiSummary,
} from './netwatch';

/* Fixtures ------------------------------------------------------------------ */

// Captura REAL de esta máquina (locale ES): WiFi Norma-2.4 conectado, señal 72%.
const RAW_INTERFACES_ES_CONECTADO = `
Hay 1 interfaz en el sistema: 

    Nombre                 : Wi-Fi
    Descripción            : Intel(R) Dual Band Wireless-AC 3160
    GUID                   : 510a0cfd-fc66-49cf-ab15-a425e16f1c7b
    Dirección física       : 34:de:1a:b4:f2:7b
    Estado                 : conectado
    SSID                   : Norma-2.4
    BSSID                  : 78:90:a2:30:e0:62
    Tipo de red            : Infraestructura
    Tipo de radio          : 802.11n
    Autenticación          : WPA2-Personal
    Cifrado                : CCMP
    Modo de conexión       : Conexión automática
    Canal                  : 5
    Velocidad de recepción (Mbps)   : 81
    Velocidad de transmisión (Mbps) : 81
    Señal                           : 72% 
    Perfil                 : Norma-2.4 

    Estado de la red hospedada: No disponible
`;

const RAW_INTERFACES_EN_DESCONECTADO = `There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Dual Band Wireless-AC 3160
    GUID                   : 510a0cfd-fc66-49cf-ab15-a425e16f1c7b
    Physical address       : 34:de:1a:b4:f2:7b
    State                  : disconnected
    Hosted network status  : Not available
`;

const RAW_INTERFACES_SIN_WIFI = `There is no wireless interface on the system.
`;

const RAW_PERFILES_ES = `
Perfiles en la interfaz Wi-Fi:

Perfiles de directiva de grupo (solo lectura)
---------------------------------------------
    <Ninguno>

Perfiles de usuario
-------------------
    Perfil de todos los usuarios     : Norma-2.4
    Perfil de todos los usuarios     : Norma-5GHz
    Perfil de todos los usuarios     : Redmi A3
`;

const RAW_PERFILES_EN = `Profiles on interface Wi-Fi:

Group policy profiles (read only)
---------------------------------
    <None>

User profiles
-------------
    All User Profile : HomeNet
    All User Profile : Office-5G
`;

/* Parsers -------------------------------------------------------------------- */

describe('stripDiacritics', () => {
  it('normaliza acentos y caja para labels ES/EN', () => {
    expect(stripDiacritics('Señal')).toBe('senal');
    expect(stripDiacritics('ESTADO')).toBe('estado');
    expect(stripDiacritics('Descripción')).toBe('descripcion');
  });
});

describe('parseWlanInterfaces', () => {
  it('parsea la salida real ES conectado (ssid/señal/perfil)', () => {
    const ifaces = parseWlanInterfaces(RAW_INTERFACES_ES_CONECTADO);
    expect(ifaces).toHaveLength(1);
    const w = ifaces[0]!;
    expect(w.nombre).toBe('Wi-Fi');
    expect(w.estado).toBe('connected');
    expect(w.ssid).toBe('Norma-2.4');
    expect(w.senalPct).toBe(72);
    expect(w.perfil).toBe('Norma-2.4');
  });

  it('REGRESIÓN: "desconectado" NO se clasifica como connected', () => {
    const [w] = parseWlanInterfaces(RAW_INTERFACES_EN_DESCONECTADO);
    expect(w?.estado).toBe('disconnected');
    expect(w?.ssid).toBeNull();
  });

  it('REGRESIÓN: "Señal" con mojibake cp850 ("Se¤al") sigue parseando la señal', () => {
    const raw = RAW_INTERFACES_ES_CONECTADO.replace('Señal', 'Se\u00A4al');
    const [w] = parseWlanInterfaces(raw);
    expect(w?.estado).toBe('connected');
    expect(w?.senalPct).toBe(72);
  });

  it('sin adaptador WLAN devuelve lista vacía', () => {
    expect(parseWlanInterfaces(RAW_INTERFACES_SIN_WIFI)).toEqual([]);
    expect(wifiSummary([])).toBeNull();
  });

  it('wifiSummary resume el primer adaptador', () => {
    const s = wifiSummary(parseWlanInterfaces(RAW_INTERFACES_ES_CONECTADO));
    expect(s).toEqual({
      presente: true,
      connected: true,
      ssid: 'Norma-2.4',
      senalPct: 72,
      perfil: 'Norma-2.4',
    });
  });
});

describe('parseWlanProfiles', () => {
  it('parsea perfiles ES ("Perfil de todos los usuarios")', () => {
    expect(parseWlanProfiles(RAW_PERFILES_ES)).toEqual(['Norma-2.4', 'Norma-5GHz', 'Redmi A3']);
  });

  it('parsea perfiles EN ("All User Profile")', () => {
    expect(parseWlanProfiles(RAW_PERFILES_EN)).toEqual(['HomeNet', 'Office-5G']);
  });
});

describe('parsePingOutput', () => {
  it('detecta pong por TTL (EN)', () => {
    const r = parsePingOutput(
      'Reply from 1.1.1.1: bytes=32 time=12ms TTL=57\nPackets: Sent = 1, Received = 1, Lost = 0',
    );
    expect(r).toEqual({ ok: true, razon: 'pong' });
  });

  it('detecta pong por TTL (ES "TTL=")', () => {
    const r = parsePingOutput('Respuesta desde 1.1.1.1: bytes=32 tiempo=14ms TTL=57');
    expect(r.ok).toBe(true);
  });

  it('detecta timeout ES sin confundir con pong', () => {
    const r = parsePingOutput('Tiempo de espera agotado para esta solicitud.');
    expect(r).toEqual({ ok: false, razon: 'timeout' });
  });

  it('detecta unreachable EN', () => {
    const r = parsePingOutput('Destination host unreachable.');
    expect(r).toEqual({ ok: false, razon: 'unreachable' });
  });
});

/* Decisión -------------------------------------------------------------------- */

function baseInput(over: Partial<Parameters<typeof decideNetAction>[0]> = {}) {
  return {
    summary: wifiSummary(parseWlanInterfaces(RAW_INTERFACES_ES_CONECTADO)),
    probeOk: true,
    accionesRecientes: 0,
    ultimaAccionHaceSeg: null,
    config: resolveNetWatchConfig({}),
    ...over,
  };
}

describe('decideNetAction', () => {
  it('online → noop auditable', () => {
    const d = decideNetAction(baseInput());
    expect(d.accion).toBe('noop');
    expect(d.muta).toBe(false);
    expect(d.razon).toBe('conectado_y_probe_ok');
  });

  it('sin interfaz WiFi → report_only (desktop ethernet)', () => {
    const d = decideNetAction(baseInput({ summary: null }));
    expect(d).toMatchObject({ accion: 'report_only', muta: false });
    expect(d.razon).toBe('sin_interfaz_wifi');
  });

  it('conectado pero sin internet → reconnect al perfil conocido', () => {
    const d = decideNetAction(baseInput({ probeOk: false }));
    expect(d.accion).toBe('reconnect');
    expect(d.muta).toBe(true);
    expect(d.argv).toEqual(netshConnectArgv('Norma-2.4'));
    expect(d.razon).toContain('conectado_sin_internet_reconnect_Norma-2.4');
  });

  it('desconectado → reconnect al perfil del último estado', () => {
    const desconectado = wifiSummary(
      parseWlanInterfaces(RAW_INTERFACES_ES_CONECTADO.replace(/Estado\s+: conectado/, 'Estado                 : desconectado').replace(/SSID\s+: Norma-2\.4/, 'SSID                   :')),
    );
    // El fixture modificado pierde perfil; inyectamos perfilPreferido explícito.
    const d = decideNetAction(
      baseInput({
        summary: desconectado,
        config: resolveNetWatchConfig({ perfilPreferido: 'Norma-2.4' }),
      }),
    );
    expect(d.accion).toBe('reconnect');
    expect(d.argv).toEqual(netshConnectArgv('Norma-2.4'));
  });

  it('desconectado sin perfil conocido → scan (no muta)', () => {
    const d = decideNetAction(
      baseInput({
        summary: wifiSummary(parseWlanInterfaces(RAW_INTERFACES_EN_DESCONECTADO)),
        config: resolveNetWatchConfig({ autoConnect: false }),
      }),
    );
    expect(d.accion).toBe('scan');
    expect(d.muta).toBe(false);
    expect(d.argv).toEqual(netshNetworksArgv());
  });

  it('autoConnect=false con internet caído → scan sin mutar', () => {
    const d = decideNetAction(
      baseInput({ probeOk: false, config: resolveNetWatchConfig({ autoConnect: false }) }),
    );
    expect(d.accion).toBe('scan');
    expect(d.muta).toBe(false);
  });

  it('anti-thrash: dentro del enfriamiento no reconecta', () => {
    const d = decideNetAction(baseInput({ probeOk: false, ultimaAccionHaceSeg: 30 }));
    expect(d.accion).toBe('report_only');
    expect(d.muta).toBe(false);
    expect(d.razon).toContain('enfriamiento_120s_faltan_90s');
  });

  it('anti-thrash: tope horario bloquea la acción mutante', () => {
    const d = decideNetAction(baseInput({ probeOk: false, accionesRecientes: 6 }));
    expect(d.accion).toBe('report_only');
    expect(d.razon).toBe('tope_horario_6/6');
  });

  it('el tope horario NO bloquea decisiones informativas (noop)', () => {
    const d = decideNetAction(baseInput({ accionesRecientes: 99 }));
    expect(d.accion).toBe('noop');
  });
});

/* argv builders --------------------------------------------------------------- */

describe('argv builders', () => {
  it('status/profiles exactos', () => {
    expect(netshStatusArgv()).toEqual(['netsh', 'wlan', 'show', 'interfaces']);
    expect(netshProfilesArgv()).toEqual(['netsh', 'wlan', 'show', 'profiles']);
  });

  it('connect con y sin interfaz', () => {
    expect(netshConnectArgv('Redmi A3')).toEqual([
      'netsh', 'wlan', 'connect', 'name=Redmi A3',
    ]);
    expect(netshConnectArgv('Redmi A3', 'Wi-Fi')).toEqual([
      'netsh', 'wlan', 'connect', 'name=Redmi A3', 'interface=Wi-Fi',
    ]);
  });

  it('disconnect y networks', () => {
    expect(netshDisconnectArgv('Wi-Fi')).toEqual(['netsh', 'wlan', 'disconnect', 'interface=Wi-Fi']);
    expect(netshNetworksArgv()).toEqual(['netsh', 'wlan', 'show', 'networks']);
  });

  it('ping cross-platform win/unix', () => {
    expect(pingProbeArgv('1.1.1.1', 'win32')).toEqual(['ping', '-n', '1', '-w', '3000', '1.1.1.1']);
    expect(pingProbeArgv('1.1.1.1', 'linux')).toEqual(['ping', '-c', '1', '-W', '3', '1.1.1.1']);
  });

  it('probeSequence corta en el primer OK', () => {
    expect(probeSequence([{ host: 'a', ok: false }, { host: 'b', ok: true }])).toEqual({
      ok: true,
      hostQueRespondio: 'b',
    });
    expect(probeSequence([{ host: 'a', ok: false }]).ok).toBe(false);
  });
});

/* Config + auditoría + schedule ----------------------------------------------- */

describe('resolveNetWatchConfig', () => {
  it('defaults keyless operativos', () => {
    const c = resolveNetWatchConfig({});
    expect(c.hosts).toEqual(['1.1.1.1', '8.8.8.8']);
    expect(c.intervaloSeg).toBe(60);
    expect(c.enfriamientoSeg).toBe(120);
    expect(c.maxAccionesPorHora).toBe(6);
    expect(c.autoConnect).toBe(true);
  });

  it('rechaza configuración peligrosa (tope horario > 12, enfriamiento < 30)', () => {
    expect(() => resolveNetWatchConfig({ maxAccionesPorHora: 13 })).toThrow();
    expect(() => resolveNetWatchConfig({ enfriamientoSeg: 10 })).toThrow();
  });
});

describe('auditEntryNdjson', () => {
  it('línea NDJSON determinista con claves ordenadas', () => {
    const line = auditEntryNdjson({
      ts: '2026-08-26T02:00:00.000Z',
      decision: 'reconnect',
      razon: 'desconectado_reconnect_Norma-2.4',
      ssid: null,
      senalPct: null,
      probeOk: false,
      argvEjecutado: ['netsh', 'wlan', 'connect', 'name=Norma-2.4'],
      resultado: 'ok',
    });
    expect(line).toBe(
      '{"argvEjecutado":["netsh","wlan","connect","name=Norma-2.4"],"decision":"reconnect",' +
        '"probeOk":false,"razon":"desconectado_reconnect_Norma-2.4","resultado":"ok",' +
        '"senalPct":null,"ssid":null,"ts":"2026-08-26T02:00:00.000Z"}',
    );
    // Dos serializaciones idénticas → determinista.
    const again = auditEntryNdjson({
      ts: '2026-08-26T02:00:00.000Z',
      decision: 'reconnect',
      razon: 'desconectado_reconnect_Norma-2.4',
      ssid: null,
      senalPct: null,
      probeOk: false,
      argvEjecutado: ['netsh', 'wlan', 'connect', 'name=Norma-2.4'],
      resultado: 'ok',
    });
    expect(line).toBe(again);
  });
});

describe('schedule', () => {
  const opts = { taskName: 'UltraIa-NetWatch', cadaNMinutos: 5, workdir: 'C:\\UltraIa' };
  it('schtasks apunta al runner --once', () => {
    const s = netwatchSchtasksArgv(opts);
    expect(s.cmd).toBe('schtasks');
    expect(s.args.join(' ')).toContain('/TN UltraIa-NetWatch');
    expect(s.args.join(' ')).toContain('/SC MINUTE /MO 5');
    expect(s.args.at(-1)).toContain('Task\\netwatch-run.ts --once');
  });
  it('cron ajusta N a divisor válido de 60', () => {
    expect(netwatchCronLine(opts)).toContain('*/5 * * * *');
    expect(netwatchCronLine({ ...opts, cadaNMinutos: 7 })).toContain('*/10 * * * *');
    expect(netwatchCronLine({ ...opts, cadaNMinutos: 45 })).toContain('0 * * * *');
    expect(netwatchCronLine(opts)).toContain('Task/netwatch-run.ts --once');
  });
});
