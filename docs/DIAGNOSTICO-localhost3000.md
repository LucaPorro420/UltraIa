# Diagnóstico Completo: localhost:3000

**Fecha:** 2026-08-30 | **Proyecto:** UltraIa | **Next.js:** 15.3.3 | **React:** 19.2.3

---

## Resumen (en palabras simples)

Cuando abres `http://localhost:3000`, el navegador muestra errores porque:
1. **Las fuentes no cargan** — el servidor bloquea Google Fonts
2. **Los archivos JS/CSS dan 404** — la caché está vieja y los archivos ya no existen
3. **Una extensión de Chrome se mete** — "Plurality" inyecta scripts que causan conflictos

---

## Problemas encontrados

### PROB-001: CSP bloquea Google Fonts (CRÍTICO)

**Qué pasa:** Las fuentes Inter, Plus Jakarta Sans y JetBrains Mono no cargan.

**Por qué:** El servidor tiene una regla de seguridad que dice "solo acepto fuentes de mi propio servidor", pero las fuentes vienen de Google.

**Error en consola:**
```
Refused to load the stylesheet from fonts.googleapis.com
because it violates Content Security Policy: font-src 'self' data:
```

**Solución:** Agregar Google Fonts a la lista de permitidos.

---

### PROB-002: WebSocket bloqueado para Hot Reload (CRÍTICO)

**Qué pasa:** Cuando cambias código, el navegador no se actualiza solo. Tienes que recargar manualmente.

**Por qué:** Next.js usa WebSocket para actualizar en caliente, pero el CSP no lo permite.

**Error en consola:**
```
WebSocket connection to 'ws://localhost:3000/_next/webpack-hmr' failed
```

**Solución:** Permitir WebSocket en el CSP.

---

### PROB-003: Extensión Plurality de Chrome (ALTO)

**Qué pasa:** La extensión "Plurality" (app.plurality.network) inyecta scripts en localhost:3000, causando errores de MIME type.

**Error en consola:**
```
[Plurality][DEBUG] Content script loaded, notifying extensionReady.
APP_BASE_URL: https://app.plurality.network
current origin: http://localhost:3000
```

**Solución:** Deshabilitar la extensión para localhost:
1. Abrir `chrome://extensions`
2. Buscar "Plurality"
3. En "Permitido en", NO agregar localhost:3000
4. O usar modo incógnito (Ctrl+Shift+N)

---

### PROB-004: Caché de webpack desactivada (ALTO)

**Qué pasa:** Cada vez que abres una página, el servidor tarda 35-60 segundos en compilar todo desde cero.

**Por qué:** En `next.config.ts` hay `config.cache = false` que desactiva la caché.

**Solución:** Cambiar a caché de sistema de archivos (persistente).

---

### PROB-005: output: 'standalone' en desarrollo (MEDIO)

**Qué pasa:** La opción `output: 'standalone'` está diseñada para producción. En desarrollo puede causar problemas con archivos estáticos.

**Solución:** Eliminar esta opción o condicionarla a producción.

---

## Soluciones aplicadas

| # | Problema | Archivo modificado | Cambio |
|---|----------|-------------------|--------|
| 1 | Google Fonts bloqueado | `next.config.ts` | Agregado `https://fonts.googleapis.com` y `https://fonts.gstatic.com` al `font-src` |
| 2 | WebSocket bloqueado | `next.config.ts` | Agregado `ws://localhost:*` y `wss://localhost:*` al `connect-src` |
| 3 | Caché desactivada | `next.config.ts` | Cambiado `config.cache = false` a `config.cache = { type: 'filesystem' }` |
| 4 | standalone en dev | `next.config.ts` | Eliminada línea `output: 'standalone'` |

---

## Acción que DEBES tomar tú

### Deshabilitar extensión Plurality

1. Abre Chrome
2. Ve a `chrome://extensions`
3. Busca "Plurality"
4. Haz clic en "Detalles"
5. En "Permitido en", selecciona "En los sitios que especifiques"
6. **NO** agregues `localhost:3000` a la lista
7. Alternativa: desactiva la extensión completamente

### Verificar que funciona

1. Mata procesos node: `taskkill /F /IM node.exe`
2. Limpia caché: elimina la carpeta `apps/web/.next/`
3. Inicia el servidor: `npm run dev`
4. Abre `http://localhost:3000` en Chrome
5. Abre DevTools (F12) → pestaña Console
6. **No debería haber errores** de MIME type ni 404

---

## Archivos de referencia

- **JSON (para traducción automática):** `docs/DIAGNOSTICO-localhost3000.json`
- **Este archivo (humano):** `docs/DIAGNOSTICO-localhost3000.json` → traducir con Google Translate
