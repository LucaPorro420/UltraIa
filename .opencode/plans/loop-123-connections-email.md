# Plan: loop-123 — Conexiones con método de seguridad "código vía mail"

## Contexto
El usuario pidió: *"agrega las conexiones con método de seguridad código vía mail para tener
todas las app que necesitamos e redes sociales conectadas directo al proyecto"*.

Estado actual del repo (verificado 26/08/2026):
- `/connections` (apps/web) **ya existe** y soporta 10 redes sociales (youtube_shorts, tiktok,
  x, instagram, threads, facebook, linkedin, telegram, discord, slack) con tokens cifrados +
  test/delete. Es decir, "redes sociales conectadas" está en gran parte cubierto.
- **Falta** el "método de seguridad código vía mail": no existe verificación por email ni OTP.
- No hay librería de email en el repo (keyless-first) → el sender será dev-log por defecto,
  con SMTP opcional vía env (`SMTP_*`).
- Apps: web (auth API REST para móvil), mobile (usa la API web), headroom (separado). "Todas las
  app" = que la API de seguridad por email sea central y la consuman web + mobile.

## Objetivo
Añadir un **método de seguridad de código por email** reutilizable y testeado, y cablearlo a:
1. Verificación de email en el registro (cuenta queda `emailVerified` tras introducir el código).
2. Puerta 2FA por email antes de guardar un token de red social en `/connections`.
De esta forma "todas las app" (web + mobile vía misma API) y "redes sociales" quedan conectadas
directo al proyecto con una capa de seguridad por código.

## Pasos (incremento 1 — fundación, este ciclo)
1. `packages/core/src/tools/emailCode.ts` — primitiva de seguridad:
   - `generateNumericCode(len=6)` (crypto-random, solo dígitos).
   - `hashCode(code)` (sha256) y `constantTimeEqual` (timing-safe).
   - `EmailCodeStore` (interfaz; impl in-memory por defecto, adaptable a Prisma).
   - `createEmailCode({email, purpose, store, ttlMs, clock})` y
     `verifyEmailCode({email, purpose, code, store, maxAttempts, clock})` (single-use, expiración,
     intentos máximos, aislamiento por `purpose`).
   - `EmailSender` (interfaz) + `createConsoleEmailSender` (dev-log) +
     `createEnvEmailSender` (SMTP si `SMTP_*` presentes, si no dev-log).
   - `sendEmailCode({email, code, purpose, sender})`.
   - zod: `EmailPurposeSchema` (email_verify | connection_2fa | login_otp | password_reset).
2. `packages/core/src/tools/emailCode.test.ts` — tests deterministas (formato, hash, verify ok,
   expirado, código erróneo, demasiados intentos, single-use, aislamiento por purpose, sender mock).
3. Exportar en `packages/core/src/tools/index.ts` (`export * from './emailCode'`).

## Pasos (incremento 2 — cableado registro)
- Prisma: añadir `emailVerified Boolean @default(false)` (+ opcional `emailCodeHash`/
  `emailCodeExpires` si se persiste en BD en vez de store in-memory). Migración `db:migrate`.
- `POST /api/auth/register`: tras crear usuario, `createEmailCode` + `sendEmailCode`.
- `POST /api/auth/verify-email`: `verifyEmailCode` → marca `emailVerified=true`.
- `POST /api/auth/login`: rechaza si `emailVerified=false` (o permite login pero force-verify).

## Pasos (incremento 3 — cableado connections 2FA)
- En `/api/connections` (save): antes de persistir token, exigir `verifyEmailCode` con
  `purpose: 'connection_2fa'` (el cliente pide un código, lo muestra/reenvía, usuario lo introduce).
- UI `/connections`: botón "Enviar código" + input de código en el diálogo de alta de canal.

## Archivos a tocar
- NUEVO `packages/core/src/tools/emailCode.ts`
- NUEVO `packages/core/src/tools/emailCode.test.ts`
- EDITAR `packages/core/src/tools/index.ts` (export)
- (inc2) `prisma/schema.prisma`, `apps/web/src/app/api/auth/register/route.ts`,
  `apps/web/src/app/api/auth/verify-email/route.ts` (nueva),
  `apps/web/src/app/api/auth/login/route.ts`
- (inc3) `apps/web/src/app/api/connections/route.ts`,
  `apps/web/src/app/(app)/connections/connections-client.tsx`

## NO hacer
- No tocar `vendor/G0DM0D3` (React 18 de referencia).
- No añadir dependencias de email (nodemailer/etc.) sin confirmación; usar dev-log + SMTP-env.
- No empujar el WIP de la sesión concurrente #25 (está en `stash@{0}` tras el rebase de push).

## Criterios de aceptación
- `npm run test` (core) GREEN con los nuevos tests de `emailCode`.
- `emailCode` es puro/determinista (clock + store + sender inyectables) → testeable sin red.
- typecheck/lint GREEN tras export.

## Tolerancias
- Envío real de email requiere `SMTP_*`; sin ellas el código se loguea (dev). No bloquea tests.
- Sin `db:migrate` en inc2 hasta confirmación del usuario (o se hace en ciclo siguiente).

## Riesgos
- Cablear registro toca Prisma + auth (superficie sensible). Se hará tras inc1 verde y con migración
  atómica.
- Conclusión de sesión concurrente #25: su WIP quedó en `stash@{0}` (autostash del rebase). No
  integrar. Recuperable con `git stash pop` por esa sesión.

## Estado (26/08/2026)
- inc1 (fundación emailCode.ts + tests 15/15 + export): DONE, commit 3ad2b1a (pusheado).
- inc3 (2FA en Conexiones) — ELEGIDO POR EL USUARIO: DONE.
  - `apps/web/src/lib/server/emailCodeStore.ts` (store singleton en memoria).
  - `apps/web/src/app/api/connections/send-code/route.ts` (POST envía código al email del admin).
  - `apps/web/src/app/api/connections/route.ts` (POST exige + verifica `code` 2FA antes de guardar).
  - `apps/web/src/app/(app)/connections/connections-client.tsx` (UI: banner + "Enviar código" + input).
  - Gates web GREEN: typecheck / lint / build. (inc2 registro queda pendiente; el full-suite
    sigue rojo solo por el WIP netwatch de la sesión #25, no por este cambio.)
- Limitación conocida: store en memoria = válido para una instancia de servidor. Para
  multi-instancia, migrar a Prisma (tabla EmailCode). Sin SMTP configurado, el código se
  imprime en consola del servidor (dev-log); con `SMTP_*` se envía real.

## Expansión de canales (26/08/2026)
- El usuario pidió "más apps/web/redes que generen dinero y repercusión". Se amplió el registro
  de `CANALES` (route.ts) y `CANAL_META` (client) de 10 → 22 plataformas, priorizando
  monetización + alcance:
  - Nuevos: `youtube` (canal completo), `pinterest`, `reddit`, `medium`, `substack`, `patreon`,
    `twitch`, `whatsapp`, `email` (newsletter), `outlook` (MS Graph), `github` (Sponsors), `gitlab`.
  - Existentes conservadas: `youtube_shorts`, `tiktok`, `x`, `instagram`, `threads`, `facebook`,
    `linkedin`, `telegram`, `discord`, `slack`.
- La puerta 2FA por email (inc3) es genérica y cubre TODOS los canales nuevos automáticamente
  (keyFor ignora el canal; el código se verifica por `connection_2fa`).
- Pendiente (fuera de este incremento): adapters de publicación AutoPub para los nuevos canales
  sociales (pinterest/reddit/medium/etc.) y uso real de `email`/`outlook`/`github` como canales de
  envío/automatización. El registro ya permite conectarlos y guardar sus tokens de forma segura.
