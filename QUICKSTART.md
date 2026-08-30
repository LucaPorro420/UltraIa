# QUICKSTART — UltraIa

Todo lo que necesitas hacer para levantar el proyecto, en un solo lugar.

## Requisitos previos (una vez)

| Herramienta | Cómo instalarla | Por qué |
|---|---|---|
| Node.js >= 20 | https://nodejs.org | Next.js + npm workspaces |
| Python >= 3.10 | https://python.org | Pipeline ar-SA + webhooks |
| ffmpeg | `winget install Gyan.FFmpeg` | Render/assembly de video |

## Arrancar TODO con un solo comando

```powershell
python start.py
```

Eso hace automáticamente: verifica prerequisitos → `npm install` (si falta) → crea `.env` desde `.env.example` (si falta) → `npm run db:migrate` (si la DB no existe) → levanta la web (`http://localhost:3000`) + webhooks (`http://localhost:8000`). Ctrl+C detiene todo.

### Variantes

```powershell
python start.py --web          # solo la web
python start.py --hooks        # solo webhooks
python start.py --validate     # validar pipeline ar-SA (sin servidores)
python start.py --skip-setup   # arrancar sin tocar install/.env/migrate
```

## Setup manual (si prefieres paso a paso)

```powershell
npm install
cp .env.example .env                # root: para Prisma CLI
cp apps/web/.env.example apps/web/.env  # Next.js runtime
# Generar AUTH_SECRET para sesiones:
$secret = python -c "import secrets; print(secrets.token_hex(32))"
(Get-Content apps/web/.env) -replace '^AUTH_SECRET=$', "AUTH_SECRET=$secret" | Set-Content apps/web/.env
npm run db:migrate                  # crea packages/core/prisma/dev.db
npm run dev                         # http://localhost:3000
```

## API keys que debes poner

Todas las keys son **opcionales** — sin ellas, el sistema usa fallbacks keyless (Ollama local, Pollinations imágenes, Tunetank música, edge-tts voz). Pon las claves reales en `apps/web/.env`:

| Variable | Necesaria para |
|---|---|
| `ULTRAIA_PROVIDER` | Proveedor LLM: `ollama` (default, local) / `openai` / `google` / `deepseek` / `openrouter` / `groq` |
| `OPENAI_API_KEY` | Solo si usas OpenAI como proveedor |
| `GOOGLE_API_KEY` | Solo si usas Google Gemini (gratis) |
| `AUTH_SECRET` | Sesiones de usuario (ya generado en .env) |

Para canales de publicación (Telegram, Discord, YouTube, etc.) guía completa: `docs/CANALES-CONFIG-2026.md`.

## Verificación de calidad (espejo del CI)

```powershell
npm run typecheck   # tsc en core + web
npm run lint        # ESLint (web)
npm run test        # Vitest: 2053+ (core + runtime)
npm run build       # build de producción
```

Última corrida (30/08/2026): todo verde — typecheck 0 errores, lint 0 avisos, tests 2053+, build OK 191 páginas.

## Estado de servicios

| Servicio | Comando | URL |
|---|---|---|
| Web (Next.js) | `python start.py --web` | http://localhost:3000 |
| Webhooks (FastAPI) | `python start.py --hooks` | http://localhost:8000 |
| DB SQLite | generada por `db:migrate` | `packages/core/prisma/dev.db` |
| Prisma Studio | `npm run db:studio` | http://localhost:5555 |

## Rutas de interés en el repo

- `packages/core/src/domain/` — lógica de negocio (blueprint, improve, eval, versions)
- `apps/web/src/app/api/` — endpoints (chat, conversations, v1/agents, tools)
- `ULTRAIA/integracionesImplementacion/` — pipeline ar-SA (`main.py`) + webhooks
- `learning/` — memoria de aprendizaje verificada (16/16 casos PASS)
