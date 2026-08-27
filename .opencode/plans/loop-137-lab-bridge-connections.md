# Plan — loop-137: Lab publish usa conexiones guardadas (Connections Center)

## Contexto
El usuario confirmó cerrar el lazo "conexiones → publicar". El Connections Center ya guarda tokens de canal
cifrados (AES-256-GCM, `CONNECTIONS_SECRET`) con 2FA por mail. El Lab publish solo usaba env o credenciales
de sesión explícitas. Mejora: si el usuario no pega token en el panel, el Lab usa la conexión guardada en la
DB para ese canal. Precedencia: sesión > DB guardada > env.

## Objetivo
- `POST /api/lab/publish` resuelve el token vía `getConnection(prisma, canal)` (dominio existente,
  reutiliza el cifrado actual — NO se reimplementa).
- Seguridad: leer el token crudo de la DB requiere `user.role === 'ADMIN'` (igual que administrar
  conexiones). Sesión explícita funciona para cualquier logueado. El token NUNCA se expone al cliente.
- `chatId`/`channel` se toman de `creds` de sesión o de `meta` de la conexión guardada.

## Archivos a tocar
- `apps/web/src/app/api/lab/publish/route.ts` — bridar `getConnection` + `prisma`, merge de credenciales.

## NO-hacer
- NO reimplementar cifrado ni crear nuevo almacén. NO exponer el token en la respuesta. NO tocar
  `api/connections/route.ts`. NO archivos de la sesión concurrente #25.

## Criterios de verificación (scoped)
- typecheck ✅ lint ✅ test (runtime, no afectado) ✅ build ✅.
- Razonamiento: `getConnection` ya existe y descifra; los adapters usan `??` sobre env. Merge sesión>DB.

## Predicción
Publicar desde el Lab ahora funciona sin `.env` si el admin guardó la conexión. Gates verdes.
Commit `feat(lab): bridar conexiones guardadas del Connections Center al publicador`.
