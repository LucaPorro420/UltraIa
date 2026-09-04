# Auth — Cómo funciona el login y la seguridad

> **Archivos:** `packages/core/src/auth/`, `apps/web/src/app/api/auth/`
> **Tipo:** Sesiones con tokens (no JWT)
> **Seguridad:** Contraseñas cifradas, tokens hasheados, brute-force protection

---

## 1. ¿Qué es la autenticación?

Es como la **puerta de un club**: solo entra quien tiene pulsera (token).

Cuando haces login:
1. Eresas tu email y contraseña
2. El sistema verifica que sean correctos
3. Te da una "pulsera" (token secreto)
4. Cada vez que haces algo, muestras la pulsera
5. El sistema dice "sí, eres tú" y te deja pasar

---

## 2. Cómo funciona el login

```
Tú escribes: "admin" / "admin"
        │
        ▼
┌─────────────────────────┐
│  POST /api/auth/login   │
│  (route.ts)             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ¿Existe el usuario?    │
│  Buscar en la DB        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  ¿La contraseña es      │
│  correcta?              │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Crear sesión (token)   │
│  Guardar en la DB       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Devolver token al      │
│  navegador              │
└─────────────────────────┘
```

---

## 3. Los archivos de auth

### `packages/core/src/auth/session.ts`
**Qué hace:** Crear, verificar y destruir sesiones.

```typescript
// Crear sesión (cuando haces login)
const { token, expiresAt } = await createSession(db, userId);

// Verificar sesión (en cada petición)
const user = await getSessionUser(db, token);

// Destruir sesión (cuando haces logout)
await destroySession(db, token);
```

### `packages/core/src/auth/password.ts`
**Qué hace:** Cifrar y verificar contraseñas.

```typescript
// Cifrar contraseña (cuando te registras)
const hash = await hashPassword('mi contraseña');

// Verificar contraseña (cuando haces login)
const esCorrecta = await verifyPassword('mi contraseña', hash);
```

### `apps/web/src/app/api/auth/login/route.ts`
**Qué hace:** Recibe el login y devuelve un token.

---

## 4. El token (la "pulsera")

El token es una cadena aleatoria muy larga:

```
abc123def456ghi789...  (32 bytes = 64 caracteres)
```

**Características:**
- Se crea cuando haces login
- Dura 30 días
- Se guarda en un cookie (`ultraia_session`)
- NUNCA se guarda tal cual en la DB (se "mezcla" con hash)

---

## 5. Protección contra fuerza bruta

Si alguien intenta adivinar tu contraseña:

| Intentos | Resultado |
|----------|-----------|
| 1-4 | Sigue intentando |
| 5 | **Bloqueado 15 minutos** |

```typescript
// En apps/web/src/app/api/auth/login/route.ts
const lockCheck = isLockedOut(ip, identifier);
if (lockCheck.locked) {
  return Response.json({ error: 'Too many attempts' }, { status: 429 });
}
```

---

## 6. Cómo crear un nuevo usuario

### Por la web (registro)

1. Ve a `/register`
2. Escribe email, nombre y contraseña
3. El sistema crea el usuario en la DB

### Por la base de datos (admin)

```typescript
// En un script o consola
import { prisma, hashPassword } from '@ultraia/core';

const hash = await hashPassword('contraseña-segura');
await prisma.user.create({
  data: {
    email: 'nuevo@ejemplo.com',
    name: 'nuevo-usuario',
    passwordHash: hash,
    role: 'USER',
  },
});
```

---

## 7. Cómo funciona el logout

```typescript
// El navegador borra el token
// El servidor elimina la sesión de la DB
await destroySession(db, token);
```

---

## 8. Seguridad: qué NO hacer

| ❌ No hagas esto | ✅ Haz esto |
|------------------|-------------|
| Guardar contraseñas en texto plano | Cifrar con `hashPassword` |
| Enviar tokens por URL | Usar cookies o headers |
| Sin límite de intentos | Usar brute-force protection |
| Token que nunca expira | TTL de 30 días |

---

## 9. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Invalid credentials" | Email/contraseña incorrectos | Verificar datos |
| "Session expired" | Token tiene >30 días | Volver a hacer login |
| "Locked out" | 5 intentos fallidos | Esperar 15 minutos |

---

## 10. Referencias

- [NextAuth docs](https://next-auth.js.org)
- [bcrypt docs](https://www.npmjs.com/package/bcrypt)

---

**Última actualización:** 2026-09-04
