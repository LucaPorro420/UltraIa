# Plan — loop-136: Lab publish con credenciales de sesión (sin env, sin tocar Connections Center)

## Contexto
El usuario pidió "Sigue y mejora". El pipeline de publicación del Design Lab (`/api/lab/publish`)
funciona pero requiere tokens en variables de entorno (`TELEGRAM_BOT_TOKEN`, etc.). Eso obliga al
usuario a configurar `.env` para publicar un diseño. Mejora: permitir que el Lab reciba credenciales
de canal **por petición** (solo para la sesión del navegador, NO persistidas, NO toca el backend
cifrado del Connections Center). Esto conecta "publicar a redes" con "conexiones reales" sin riesgo
de seguridad y sin duplicar el almacén cifrado existente.

## Objetivo
- `POST /api/lab/publish` acepta `creds` opcional en el body y construye el adapter con esos valores
  (precedencia sobre env, vía `??` ya implementado en los adapters).
- Canales soportados para imagen: `telegram`, `discord`, `slack` (Slack ya admite imagen vía webhook).
- UI en el tab "Tuyos": panel colapsable "Credenciales de sesión" con inputs por canal; los valores se
  envían en cada `publishTo`.

## Archivos a tocar
- `apps/web/src/app/api/lab/publish/route.ts` — aceptar `creds`, construir adapter por canal.
- `apps/web/src/components/lab-client.tsx` — estado `creds`, panel UI, pasar `creds` a `publishTo`,
  botón `slack`.

## NO-hacer
- NO leer/descifrar el backend del Connections Center (`api/connections/route.ts` ya existe y es
  cifrado + 2FA). Las credenciales de sesión son explícitas y efímeras.
- NO persistir credenciales en disco/DB.
- NO tocar archivos de la sesión concurrente #25.

## Criterios de verificación (scoped)
- typecheck ✅ lint ✅ (build solo si da tiempo; el cambio es server+client tipado).
- Razonamiento: `createTelegramAdapter/Discord/Slack` ya usan `options.x ?? process.env.X`, así que
  pasar `creds` vacíos degrada a env (comportamiento actual) y pasar valores los usa.

## Predicción
El Lab podrá publicar a Telegram/Discord/Slack pegando el token en el panel, sin `.env`. Gates verdes.
Commit `feat(lab): publish con credenciales de sesión efímeras (telegram/discord/slack)`.
