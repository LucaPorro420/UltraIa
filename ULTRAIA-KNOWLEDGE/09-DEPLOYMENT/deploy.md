# Deployment — Cómo poner UltraIa en internet

> **Plataformas:** Vercel (recomendado), Netlify, Render, Cloudflare Pages
> **Costo:** $0 (free tier)
> **Comando:** `python start.py --deploy`

---

## 1. ¿Qué es deployment?

Es como **abrir tu tienda al público**: pasas de tener el proyecto en tu computadora a que cualquiera en internet pueda usarlo.

---

## 2. Opciones gratuitas (2026)

| Plataforma | Costo | Velocidad | Notas |
|------------|-------|-----------|-------|
| **Vercel** | Gratis | Rápida | Mejor para Next.js |
| **Netlify** | Gratis | Rápida | Fácil de usar |
| **Render** | Gratis | Media | Se duerme tras 15 min |
| **Cloudflare** | Gratis | Muy rápida | CDN global |

---

## 3. Desplegar en Vercel (recomendado)

### Paso 1: Preparar el proyecto

```bash
# Asegúrate de que todo funcione
python start.py --check-connections

# Probar el build
npm run build
```

### Paso 2: Crear cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Crea cuenta con GitHub
3. Importa tu repositorio

### Paso 3: Configurar

Vercel detecta automáticamente Next.js. Solo necesitas:

1. **Root Directory:** `apps/web`
2. **Build Command:** `npm run build`
3. **Output Directory:** `.next`

### Paso 4: Agregar variables de entorno

En el panel de Vercel → Settings → Environment Variables:

```
DATABASE_URL=file:./prod.db
ULTRAIA_PROVIDER=ollama
# Agrega tus API keys aquí
```

### Paso 5: ¡Listo!

Cada vez que hagas push a GitHub, Vercel despliega automáticamente.

---

## 4. Desplegar con el comando rápido

```bash
python start.py --deploy
```

Esto:
1. Verifica prerequisitos
2. Instala dependencias
3. Compila el proyecto
4. Muestra instrucciones de hosting

---

## 5. Variables de entorno importantes

```bash
# Base de datos
DATABASE_URL=file:./prod.db

# IA (elige una)
ULTRAIA_PROVIDER=ollama    # Gratis, local
ULTRAIA_PROVIDER=openai    # Pago, GPT-4
ULTRAIA_PROVIDER=google    # Gratis, Gemini

# API Keys (opcional)
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx

# Seguridad
TRUST_PROXY=1              # Si estás detrás de un proxy
```

---

## 6. Desarrollo local vs Producción

| Aspecto | Local | Producción |
|---------|-------|------------|
| URL | `localhost:3000` | `tu-app.vercel.app` |
| Base de datos | `dev.db` | SQLite o PostgreSQL |
| IA | Ollama (local) | OpenAI/Google (nube) |
| HTTPS | No | Sí |
| Velocidad | Rápida | Depende del plan |

---

## 7. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Build failed" | Error en el código | Corregir y volver a intentar |
| "Database not found" | Falta migración | `npx prisma migrate deploy` |
| "Out of memory" | Build muy grande | Usar `--max-old-space-size=4096` |
| "Function timeout" | Función muy lenta | Optimizar o usar Edge Functions |

---

## 8. Webhook Server (servidor de webhooks)

El webhook server (`webhook_server.py`) NO se despliega gratis fácilmente.

Opciones:
1. **Railway** ($5/mes después de free tier)
2. **Render** (gratis con sleep)
3. **Localtunnel** (para pruebas): `npx localtunnel --port 8000`

---

## 9. Referencias

- [Vercel deployment](https://vercel.com/docs/deployments)
- [Next.js deployment](https://nextjs.org/docs/deployment)
- [Free hosting 2026](docs/CLOUD-FREE-2026.md)

---

**Última actualización:** 2026-09-04
