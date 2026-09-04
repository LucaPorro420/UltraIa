# Security — Cómo protegemos el proyecto

> **Auditoría:** 27/32 findings corregidos (docs/SECURITY-AUDIT.md)
> **Protecciones:** Rate limiting, brute-force, CSP, CORS, session rotation
> **Política:** Keyless-first, defense in depth

---

## 1. ¿Qué es la seguridad?

Es como las **candados de tu casa**: protegen lo que es tuyo de personas malas.

En un sitio web, la seguridad protege:
- Tus contraseñas
- Tus datos personales
- Tu dinero (si hay pagos)
- Tu reputación (que no hackeen tu sitio)

---

## 2. Las protecciones de UltraIa

### 2.1 Rate Limiting (límite de peticiones)

**¿Qué es?** Si alguien intenta adivinar tu contraseña, después de 5 intentos fallidos, lo bloqueamos 15 minutos.

```
Intento 1: ❌ Incorrecta
Intento 2: ❌ Incorrecta
Intento 3: ❌ Incorrecta
Intento 4: ❌ Incorrecta
Intento 5: ❌ Incorrecta
→ BLOQUEADO 15 minutos
```

**Dónde está:** `apps/web/src/middleware.ts`

---

### 2.2 Session Rotation (rotación de sesiones)

**¿Qué es?** Cuando haces login, te damos un token nuevo cada vez. Si alguien roba tu token viejo, no le sirve de nada.

```
Login 1: Token ABC123
Login 2: Token DEF456  ← Token nuevo, el viejo ya no funciona
```

**Dónde está:** `packages/core/src/auth/session.ts`

---

### 2.3 Password Hashing (cifrado de contraseñas)

**¿Qué es?** NUNCA guardamos tu contraseña tal cual. La "mezclamos" con un código secreto (hash) para que nadie pueda leerla.

```
Contraseña real: "mi contraseña"
Guardado en DB: "$2b$10$xJwL3vJ9Z..."
```

**Dónde está:** `packages/core/src/auth/password.ts`

---

### 2.4 CSP (Content Security Policy)

**¿Qué es?** Le dice al navegador qué scripts y estilos puede cargar. Si alguien intenta inyectar código malicioso, el navegador lo bloquea.

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
```

**Dónde está:** `apps/web/src/middleware.ts`

---

### 2.5 CSRF Protection

**¿Qué es?** Evita que alguien haga peticiones falsas a tu nombre.

**Dónde está:** `apps/web/src/middleware.ts`

---

### 2.6 Brute-force Protection

**¿Qué es?** Si alguien intenta adivinar contraseñas muy rápido, lo bloqueamos.

```typescript
// En login/route.ts
if (attempts >= 5) {
  return Response.json({ error: 'Too many attempts' }, { status: 429 });
}
```

**Dónde está:** `apps/web/src/app/api/auth/login/route.ts`

---

## 3. Cómo reportar un problema de seguridad

Si encuentras un problema:

1. **NO lo publiques** en GitHub Issues
2. **Envía un email** a [tu-email@ejemplo.com]
3. **Incluye**:
   - Qué encontraste
   - Cómo reproducirlo
   - Qué datos podrían estar en riesgo

---

## 4. Checklist de seguridad antes de deploy

```bash
# 1. ¿Las variables de entorno están seguras?
grep -r "API_KEY" .  # No debería aparecer en código

# 2. ¿Los secrets no están en Git?
git log --all --full-history -- "*.env"  # No debería haber commits de .env

# 3. ¿Las dependencias están actualizadas?
npm audit  # Revisar vulnerabilidades

# 4. ¿El build funciona?
npm run build  # Asegurar que no hay errores
```

---

## 5. Errores comunes de seguridad

| Error | Cómo evitarlo |
|-------|---------------|
| Guardar contraseñas en texto plano | SIEMPRE usar `hashPassword` |
| API keys en código | SIEMPRE usar variables de entorno |
| Sin rate limiting | SIEMPRE agregar límites |
| Tokens en URLs | SIEMPRE usar cookies o headers |
| Sin HTTPS | SIEMPRE usar HTTPS en producción |

---

## 6. Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js security](https://nextjs.org/docs/basic-features/security)
- [bcrypt docs](https://www.npmjs.com/package/bcrypt)

---

**Última actualización:** 2026-09-04
