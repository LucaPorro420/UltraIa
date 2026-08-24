# CEREBRO — autonomía total de UltraIa

El Cerebro es el orquestador autónomo del proyecto: **aprende → crea objetos y
videos desde cero → publica → reporta**, sin intervención humana.

## Los 3 motores de autonomía (todos gratis)

| Motor | ¿Corre con el PC apagado? | Coste | Qué hace |
|---|---|---|---|
| **Tarea programada de Windows** (`UltraIa-Cerebro`) | ❌ requiere PC prendido | $0 | Ciclo COMPLETO cada 120 min: crea artefactos reales Y encola publicaciones en la BD local |
| **GitHub Actions** (`.github/workflows/cerebro.yml`) | ✅ **SÍ — 24/7 en la nube** | $0 (free tier) | Cada 4 h: LEARN→CREATE→REPORT en ubuntu runner (ffmpeg incluido) y **commitea la evidencia** a `resultTask/cerebro/` |
| **Manual** | n/a | $0 | `npm run cerebro` / `npm run cerebro:plan` |

> Con PC apagado: la nube sigue aprendiendo/creando/reportando (evidencia
> versionada en el repo). Las publicaciones a canales reales se encolan cuando
> corre el ciclo local o el web app contra su BD (para 24/7 completo,
> desplegar el web — ver `DEPLOY.md`).

## Comandos

```powershell
# Local
npm run cerebro                                  # un ciclo ahora
npm run cerebro:plan                             # ver el plan sin ejecutar
.\scripts\cerebro-schedule.ps1                   # programar cada 120 min
.\scripts\cerebro-schedule.ps1 -Mode daily -At 09:00
.\scripts\cerebro-schedule.ps1 -Remove           # desprogramar

# Configurar el ciclo (opcional): .ultraia/cerebro/config.json
{ "videosPorCiclo":1, "objetosPorCiclo":2, "segundosPorVideo":6,
  "fps":12, "ancho":320, "alto":180, "canales":["youtube","tiktok","telegram"],
  "maxBriefs":2, "maxCiclosPorDia":12 }
```

## Estado actual (24/08/2026)

- Tarea local `UltraIa-Cerebro`: **HABILITADA**, cada 120 min, verificada con
  `schtasks /Run` (ciclo real: objeto 3D 1225 vértices + MP4 ffprobe-exacto +
  publicación DRAFT encolada).
- Workflow cloud `cerebro.yml`: cada 4 h, patrón del latido iter-82.
- Herramienta de agente: `cerebro_run` (capability `cerebro`, acciones
  plan/siguiente/schedule/procedural/report).

## CrewAI (decisión 24/08)

NO se implementa: el stack multi-agente nativo ya cubre Agent/Tools/Crew/
Memory/Critic/Runtime (11 blueprints bp-* + 58 capabilities + OMAG critics +
qdrant v2 + @ultraia/runtime) y es keyless-first. CrewAI queda como proveedor
opcional vía puente Python (`pip install crewai` resuelve OK en py -3.12) si
alguna vez se necesita un crew externo — no aporta capacidad que falte.

## Privacidad (auditada 24/08/2026)

| Capa | Estado |
|---|---|
| Repo GitHub | **PRIVADO** (API anónima responde 404) |
| Tokens de redes sociales | **CERO configurados** en `.env` (solo LLM keys + BD + gen-engine) — sin token, ningún adapter puede publicar aunque quiera |
| Cola `Publication` | Todo queda **DRAFT** (video exige tu aprobación humana por diseño); verificado en BD real: **0 filas PUBLISHED** |
| Salida hacia redes | SOLO si TÚ apruebas una publicación Y hay token del canal Y corre `publishDue`. Sin esos 3, nada sale |
| Artefactos (MP4/PNG/OBJ) | Viven en `.ultraia/` (**gitignored**, nunca subidos); en la nube van como artifacts privados del workflow |
| Lo que el cloud commitea | Únicamente reportes técnicos (`resultTask/cerebro/report.md`, `manifest.json`, `state.json`) a TU repo privado |

Para publicar algo a una red real necesitas, en este orden: (1) poner el token
del canal en `.env` (ver `docs/CANALES-CONFIG-2026.md`), (2) aprobar el DRAFT
(UI `/gallery`… cola en dashboard o API `POST /api/publications/[id]/approve`),
(3) que corra `publishDue` (botón/endpoint ADMIN o el ciclo local).

