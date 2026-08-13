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
cp .env.example apps/web/.env       # Next.js runtime
npm run db:migrate                  # crea packages/core/prisma/dev.db
npm run dev                         # http://localhost:3000
```

## API keys que debes poner

Pon las claves reales en `apps/web/.env` (y `ULTRAIA/integracionesImplementacion/.env` para el pipeline):

| Variable | Necesaria para |
|---|---|
| `OPENAI_API_KEY` | Generación de agentes (blueprints) y chat |
| `ULTRAIA_MODEL` | Opcional: modelo por defecto (ej. `gpt-4o`) |
| `ELEVENLABS_API_KEY` | Pipeline ar-SA: voz |
| `RUNWAY_API_KEY` | Pipeline ar-SA: video |

Sin `OPENAI_API_KEY` la web arranca igual, pero la generación de agentes reales fallará.

## Verificación de calidad (espejo del CI)

```powershell
npm run typecheck   # tsc en core + web
npm run lint        # ESLint (web)
npm run test        # Vitest: 61/61 (core)
npm run build       # build de producción
```

Última corrida (13/08/2026): todo verde — typecheck 0 errores, lint 0 avisos, tests 61/61, build OK. Dashboard: 10.0/10.

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
