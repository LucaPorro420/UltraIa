# PLAN: Turborepo scaffolding + cache (tarea #184, prioridad P1)

Fecha: 2026-09-08 · Modo: P-P · Patrón: Sensado/Razonamiento/Acción/Ajuste (bucle IA 4 fases) · Presupuesto: ~1.5h / 15k tokens

## Contexto

**Sensado integridad (pre-flight state-integrity-check 13 checks):**
- `package.json` workspaces ya definidos `["apps/*","packages/*"]` (apps/web, apps/mobile + packages/core, packages/runtime) — verificado 08/09. Monorepo funcional sin Turborepo: scripts raíz secuenciales `npm run typecheck -w @ultraia/core && npm run typecheck -w @ultraia/web && npm run typecheck -w @ultraia/runtime` (lento, sin cache).
- `turbo.json` NO existe (`Test-Path turbo.json` False). `npx turbo --version` responde `2.10.12` (instalable vía npx, no en devDeps aún).
- `packages/core` y `packages/runtime` y `apps/web` cada uno con script `typecheck`, `lint` (solo web), `test` (core/runtime), `build` (solo web).
- Iter 183 DONE (8b32875): Prisma Learning System 16 modelos migrados, 2974 tests PASS, gates FULL verde, PWA fix en apps/web. Siguiente en REPLANTEO §9: ciclo 184 = Turborepo scaffolding (previsto como draft en docs, ahora scaffolding real).
- `loop-183-prisma-learning-migracion.md` leído: su §TECNOLOGÍAS evaluó `Turborepo draft (no install)` vs Nx/pnpm; eligió Turborepo nativo sobre npm workspaces. `docs/LEARNING-SYSTEM-MIGRATION.md` leído: ADR de iter 183 confirma patrón Clean Arch + valida que siguiente paso es Turborepo para C1 FutureMindMy.
- `loop-run-log.md` último [R] 183 verde, `STATE.md` backlog: primera pendiente accionable es 184 (Gen-Engine #6 bloqueado GPU se cede), lock 182 stale ya resuelto, budget <30% día, kill-switch AUSENTE, sin colisión de plan files para 184 (`loop-184-turborepo.md` no existía hasta este plan).

**Problema:** sin `turbo.json` cada `npm run typecheck/lint/test/build` recorre workspaces secuencialmente sin cache ni paralelismo ni grafo de dependencias. Con 140+ capabilities + 3 workspaces el typecheck ya tarda 60s+ y el build 2.6 min; escalar a Turborepo es P0 de DX y base para `FutureMindMy` (Turborepo + Tauri 2 + Prisma).

**Enlaces a spec:** `LOOP.md` §Budget, `loop-constraints.md` §Code (gates FULL, staging explícito), `AGENTS.md` §Repo facts (npm workspaces).

## SPEC (S-D integrado — fase P-P)

**Requisitos precisos:**
- Entradas: `package.json` con `workspaces: ["apps/*","packages/*"]` + scripts `typecheck/lint/test/build` existentes + `npx turbo@2.10.12`.
- Salidas:
  - `turbo.json` en raíz con `$schema`, `globalDependencies`, `globalEnv`, `tasks` para `typecheck`/`lint`/`test`/`build`/`dev` (+ `db:generate` opcional), `cache:true` donde aplica, `outputs` correctos (`.next/**` para web, `dist/**`, `coverage/**`), `dependsOn: ["^build"]` donde corresponde, `persistent:true` para dev.
  - `package.json` con `workspaces` garantizado (no tocar si ya existe), `devDependencies.turbo` opcional `^2.10.0` si se decide pinnear, y scripts raíz opcionalmente con wrappers `turbo run ...` manteniendo compatibilidad con scripts actuales.
  - Cache local `.turbo/` gitignored (verificar `.gitignore` ya ignora `.turbo` o añadir).
- Límites: no migrar a pnpm/yarn, no tocar `auth/`, `.env`, `apps/web/next.config.ts` PWA hunk (184 no toca web config salvo turbo.json). No romper 2974 tests existentes. Staging explícito. No push sin aprobación.

**Criterios de aceptación:**
- [ ] `turbo.json` existe en raíz, JSON válido, `$schema: "https://turborepo.com/schema.json"`, `tasks` contiene `build`/`typecheck`/`lint`/`test` con `cache` y `outputs` definidos, `globalDependencies` incluye `**/.env.*local` o similar.
- [ ] `package.json` mantiene `workspaces: ["apps/*","packages/*"]` (o se añade si faltaba) y `npx turbo --version` => `2.10.12` (o `npx turbo run --help` OK). Si se añade `turbo` a devDeps, `npm ls turbo` o `package.json` lo refleja.
- [ ] `npm run typecheck` y `npm run build` siguen funcionando (compatibilidad). `npx turbo run typecheck --dry` o `npx turbo run build --dry=json` no error (lista tasks). Cache: segunda corrida `npx turbo run build` debe mostrar `cache hit` o al menos no re-ejecutar si nada cambió (verificable con `--dry` o log).
- [ ] `.gitignore` ignora `.turbo` y `node_modules/.cache/turbo` si aplica.
- [ ] Gates FULL verdes antes de commit: `typecheck 0 -> lint 0 -> test 2974 -> build 90+ páginas` (con turbo o sin, pero con turbo.json presente).

**Límites explícitos:**
- No cambiar `packageManager` ni lockfile (`package-lock.json`) más de lo necesario (si se añade turbo devDep, `npm install --package-lock-only` es aceptable).
- No añadir `pipeline` legacy si `tasks` es el schema v2 (usar `tasks`, compatible con 2.10).
- No exponer secretos en `globalEnv` (solo `NODE_ENV`, no `DATABASE_URL`).

## DESIGN (S-D integrado — fase P-P)

**Arquitectura elegida (Turborepo sobre npm workspaces):**
```
UltraIa/
├── package.json          # workspaces ["apps/*","packages/*"] (ya existe) + scripts raíz
├── turbo.json            # NUEVO: orquestador (tasks con cache, dependsOn, outputs)
├── apps/web              # Next.js 15 (build -> .next/**)
├── apps/mobile           # Expo (no build en turbo por defecto, solo typecheck si aplica)
├── packages/core         # @ultraia/core (typecheck, test)
├── packages/runtime      # @ultraia/runtime (typecheck, test)
└── .turbo/               # cache local (gitignored)
```

**Flujo elegido (scaffolding mínimo viable):**
1. Verificar `package.json` workspaces (si falta, añadir `["apps/*","packages/*"]`).
2. Crear `turbo.json` con `tasks`:
   - `build`: `dependsOn: ["^build"]`, `outputs: [".next/**","!.next/cache/**","dist/**"]`, `cache: true`, `env: ["NEXT_PUBLIC_*"]` si aplica.
   - `typecheck`: `dependsOn: ["^typecheck"]`, `outputs: []`, `cache: true`.
   - `lint`: `outputs: []`, `cache: true` (solo apps/web tiene lint; otros workspaces no la definen → turbo lo salta).
   - `test`: `dependsOn: ["^build"]` opcional o sin deps, `outputs: ["coverage/**"]`, `cache: true`, `inputs: ["src/**","__tests__/**"]` implícito.
   - `dev`: `cache: false`, `persistent: true`.
   - Global: `globalDependencies: ["**/.env.*local"]`, `globalEnv: ["NODE_ENV"]`.
3. (Opcional) Añadir `turbo` a `devDependencies` (`^2.10.12`) y scripts `build:turbo`/`typecheck:turbo` si no rompe compatibilidad; si no, dejar `npx turbo` como runner.
4. Verificar `.gitignore` contiene `.turbo/` (añadir si falta).
5. Validar: `npx turbo --version` + `npx turbo run typecheck --dry=json` (lista 3 tasks) + `npm run typecheck` (compat) + `npm run build` (con cache, segunda corrida hit).
6. Gates FULL + commit pathspec.

**Alternativas descartadas:**
- `Nx` (más pesado, requiere `nx.json` + plugins, overkill para 4 workspaces; Turborepo es zero-config sobre npm workspaces y Vercel-native para Next.js).
- `Lerna` (solo versionado, no cache de tasks; deprecado frente a turbo).
- `pnpm workspaces` + `pnpm -r` (requiere migrar lockfile y CI; fuera de scope P1, deja npm).
- `pipeline` legacy en turbo.json (deprecado en v2, usar `tasks`).

**Diagrama (opcional):** data-flow `workspaces --turbo.json--> cache (.turbo) --> outputs (.next/dist/coverage)` (no bloqueante para este scaffolding).

## LEARN (L-T integrado — fase P-P)

**Verdad verificada aplicable (learning/truth/ + semantic_memory):**
- `truth_web_browse_repos.json` 10/10 (reach tools) → no tocar browsing esta iter.
- `truth_ultraia_capabilities.json` 5/5 (search/image/video/code/audio) → patrón capability ya estable.
- `truth_ai_gen_resources.json` 8/8, `truth_tecno_recursos.json` 9/9 → no tocar Gen-Engine.
- Turborepo: verificado `npx turbo --version 2.10.12` (08/09) y docs `vercel.com/docs/turborepo` (cache local + remote, `tasks` schema v2, `dependsOn: ["^build"]` para topological).

**Lecciones relevantes (LEARNINGS.md):**
- Lección 66 (conexiones) + 68 (state-doctor): pre-flight con `state-integrity-check` 13 checks antes de tomar tarea; lock stale ya resuelto en 183.
- Lección 80 (wallets): `turbo.json` es config pura JSON sin secretos; no exponer `DATABASE_URL` en `globalEnv`.
- Lección 54 (harness): `turbo` usa `globalDependencies` para invalidar cache si cambia `.env.*local`.
- Lección 13 (start.py): `npm run build` con dev server corriendo rompe chunks — matar dev servers antes de gates FULL (loop_gate.py --kill).

**Biblioteca de fracasos (qué no repetir):**
- No `git add .` (staging explícito). No `Set-Content` BOM (usar Write). No commit sin pathspec (b37fcfb).
- No borrar `.next` indiscriminadamente, pero sí antes de build si stale.

**Gaps de autolearn que cierra esta tarea:**
- Gap "Monorepo sin orquestador" (RICE P1): `autolearn` detectaba `turbo.json` ausente como deuda DX. Este scaffolding lo cierra y habilita `FutureMindMy` C1 (Turborepo + Tauri 2 + Prisma).

## TEST (L-T integrado — fase P-P)

**Estrategia de verificación explícita:**
1. **Unit (config):** `turbo.json` JSON válido (`npx turbo run --help` no error, `turbo --version` 2.10.12). `cat turbo.json | python -m json.tool` 0.
2. **Dry-run:** `npx turbo run typecheck --dry=json` lista 3 packages con `typecheck`; `npx turbo run build --dry=json` lista `apps/web` con `build` y `dependsOn ^build`.
3. **Compatibilidad:** `npm run typecheck` (raíz secuencial) sigue 0; `npm run lint` 0; `npm run test` 2974 PASS.
4. **Cache:** `npx turbo run build` primera corrida miss, segunda corrida hit (log contiene `cache hit` o `FULL TURBO` sin re-ejecución). Verificable con `--dry` o `--summarize`.
5. **Scoped gates:** `npm run typecheck --workspaces` 0, `vitest run` 34 learning-system previos OK.
6. **FULL gates antes de commit:** `npm run typecheck` 0 → `npm run lint` 0 → `npm run test` (core 2724+250 runtime = 2974) → `npm run build` (90+ páginas, withPWA intacto) → `npm run harness:test` 30/30. Con `turbo.json` presente el build no debe romper.
7. **Smoke:** `GET /` 200 si dev server levantado (opcional, no bloqueante).

**Casos borde:**
- Si `turbo.json` usa `pipeline` en vez de `tasks` en v2, `turbo` warn pero funciona; preferir `tasks`.
- Si `lint` no existe en packages/core/runtime, turbo lo marca `missing` pero no falla (cache hit).
- Si `.turbo` no está en `.gitignore`, la segunda corrida igual cachea pero ensucia `git status`.

**Medirá éxito:** `turbo.json` válido + `npx turbo --version` 2.10.12 + `turbo run build --dry` OK + gates FULL verde.

## MEJORAS A ADICIONAR

1. **Orquestador Turborepo** con `turbo.json` (tasks + cache local) — base para remote cache Vercel futuro.
2. **Workspaces garantizados** en `package.json` (`apps/*`, `packages/*`) + `.gitignore` para `.turbo/`.
3. **DX más rápido:** `typecheck`/`build` cacheados (segunda corrida ~0s si nada cambió), `dependsOn: ["^build"]` topológico.
4. **Preparación FutureMindMy C1:** Turborepo listo para añadir `apps/desktop` (Tauri 2) y `packages/*` futuros sin reescribir scripts.
5. **Validación determinista:** `npx turbo --version` + `--dry=json` como smoke CI-friendly sin ejecutar builds pesados.

## TECNOLOGÍAS EVALUADAS

| Decisión | Opción elegida | Alternativas rechazadas | Razón | Fuente nueva? |
|----------|----------------|------------------------|-------|---------------|
| Orquestador monorepo | **Turborepo 2.10.12** (`tasks` + cache) | Nx 17, Lerna 8, pnpm -r | Zero-config sobre npm workspaces existentes, Vercel-native para Next 15, cache incremental sin plugins, docs oficiales | No (verificado `npx turbo --version` 08/09, vercel.com/docs/turborepo) |
| Workspaces | **npm workspaces** `apps/*` + `packages/*` (existente) | pnpm workspaces, yarn berry | Ya funciona (2974 tests), lockfile `package-lock.json` estable, no migrar en P1 | No (package.json HEAD) |
| Cache | **Local `.turbo/`** (gitignored) | Remote Vercel cache, Nx Cloud | $0/mes local primero; remote es opt-in futuro con `TURBO_TOKEN` | No |
| Schema turbo.json | **`tasks` (v2)** | `pipeline` (v1 legacy) | `tasks` es canónico en 2.10 (pipeline deprecado pero aún soportado) | Docs vercel |
| Package manager | **npm 10** (mantener) | pnpm 9, bun | CI actual usa npm, no tocar en scaffolding | No |
| Scripts raíz | **Mantener `npm run typecheck/lint/test/build` secuenciales** + `npx turbo run ...` opcional | Reemplazar todo por `turbo run` | Compatibilidad: CI `loop_gate.py` llama `npm run xxx` directo; turbo es aditivo, no breaking | No |

**Research_search obligatorio (fuente pdf):** no aplica esta iter (infra DX, no paper). Se evaluó `vercel.com/docs/turborepo` + `turbo.build/repo/docs` vía websearch si disponible; decisión queda documentada en `docs/LEARNING-SYSTEM-MIGRATION.md` (Turborepo draft) y se cierra aquí.

**Enlaces.txt:** sin nuevo intake 08/09 (último IG bloqueado requiere humano); se respeta protocolo.

**MCP/Docker/Otros lenguajes:** no adoptados esta iter (Turborepo no requiere Docker; MCP no aplica).

## Objetivo

Crear `turbo.json` con pipeline `typecheck/lint/test/build` cacheado sobre npm workspaces existentes, validar con `npx turbo --version` y gates FULL verdes, sin romper PWA ni 2974 tests.

## Pasos

1. **Pre-flight Sensado:** leer `STATE.md`, `loop-run-log.md`, `loop-constraints.md`, `learning/LEARNINGS.md`, `loop-183` y `docs/LEARNING-SYSTEM-MIGRATION.md` (ya hecho arriba). Verificar `Test-Path turbo.json` False y `npx turbo --version` 2.10.12.
2. **Escribir plan:** este archivo `.opencode/plans/loop-184-turborepo.md` + resumen `[P]` en `loop-run-log.md` con PREDICCIÓN (no tocar código aún).
3. **Backup/estado:** `git status --porcelain` inventario ruido (4M+13??, sin tocar auth/.env).
4. **Crear turbo.json:** nuevo `turbo.json` en raíz con `$schema`, `globalDependencies`, `globalEnv`, `tasks` para `build`/`typecheck`/`lint`/`test`/`dev` (+ `db:generate` opcional), `outputs` y `cache` correctos, JSON válido.
5. **Asegurar workspaces:** verificar `package.json` contiene `workspaces: ["apps/*","packages/*"]`; si falta, añadir. Verificar `.gitignore` ignora `.turbo/` (añadir si falta).
6. **(Opcional) Pinnear turbo:** si se decide, `npm pkg set devDependencies.turbo="^2.10.0"` y `npm install --package-lock-only` (sin ejecutar install completo si no necesario; npx ya funciona).
7. **Validación dry-run:** `npx turbo --version` + `npx turbo run typecheck --dry=json` + `npx turbo run build --dry=json` (no error).
8. **Scoped gates:** `npm run typecheck` (solo raíz) 0, `npm run test --workspaces` 34 learning-system OK si aplica.
9. **FULL gates con turbo.json presente:** `npm run typecheck` → `npm run lint` → `npm run test` → `npm run build` (matar dev servers antes, limpiar .next si stale) → `npm run harness:test`. Segunda corrida `npx turbo run build` debe ser cache hit si nada cambió.
10. **Commit pathspec:** `git add turbo.json package.json .gitignore` (solo los tocados) + `git commit -m "chore(turbo): add turbo.json pipeline (typecheck/lint/test/build) with cache + workspaces" -- turbo.json package.json .gitignore` (pathspec obligatorio).
11. **Post-commit:** actualizar `STATE.md` fila 184 DONE con hash + tests, append `[R]` a `loop-run-log.md` con JSON budget, cerrar lock propio si se tomó.

## Archivos a tocar (staging explícito)

- `turbo.json` — NUEVO (pipeline tasks typecheck/lint/test/build + cache + outputs)
- `package.json` — MODIFICAR solo si falta workspaces o para pinnear `turbo` en devDeps (si ya tiene workspaces, solo verificar)
- `.gitignore` — MODIFICAR solo si falta `.turbo/` (añadir línea)

## RECURSOS / PRESUPUESTO

- **Tools/scripts/skills:** `npx turbo@2.10.12`, `npm`, `tsc`, `eslint`, `vitest`, `next build`, `state-integrity-check`, `loop-concurrency-guard`, `loop-budget`, `loop_gate.py --kill`.
- **Fuentes:** `package.json` workspaces, `loop-183` plan + `docs/LEARNING-SYSTEM-MIGRATION.md` (contexto C1), `vercel.com/docs/turborepo` (cache/tasks), `learning/LEARNINGS.md`.
- **Tiempo estimado:** 1.5h (P-P 0.3h ya, P-B 1.0h: turbo.json 0.2h + package.json/.gitignore 0.1h + validación 0.2h + gates 0.5h, R 0.2h).
- **Tokens estimados:** ~15k (5k plan + 7k code/validación + 3k docs/gates).
- **Presupuesto loop-budget:** 10 ciclos/día, 100k tokens/día, 6h/día. Este ciclo consume 1 ciclo + 15k tokens + 1.5h => **15% tokens, 25% tiempo**, debajo de 80% early-exit.
- **Dependencias nuevas:** `turbo@^2.10.0` opcional en devDeps (si se pinnea; si no, npx sin install).

## NO-hacer (guardas explícitas)

- NO tocar `.env`, `.env.*`, `auth/`, `payments/`, `secrets/`, `credentials/` (denylist).
- NO tocar `apps/web/next.config.ts` (PWA hunk de 182/183 intacto).
- NO tocar `packages/core/src/**` ni `apps/web/src/**` (código de dominio no cambia en scaffolding).
- NO migrar a pnpm/yarn, no tocar `pnpm-workspace.yaml`, no cambiar `packageManager`.
- NO usar `git add .` ni `git add -A` (staging explícito por plan).
- NO commitear sin `npx turbo --version` OK y gates FULL verde.
- NO push sin aprobación humana (loop-constraints).
- NO borrar `.turbo` cache antes de verificar hit (segunda corrida).

## Criterios de verificación

- **Scoped:** `npx turbo --version` => 2.10.12, `npx turbo run typecheck --dry=json` EXIT 0 con 3 tasks, `npm run typecheck` 0.
- **FULL antes de commit:** `npm run typecheck` 0 → `npm run lint` 0 → `npm run test` 2974 PASS → `npm run build` 90+ páginas OK (withPWA disable dev) → `npm run harness:test` 30/30. Con `turbo.json` presente no regresión.
- **Cache:** segunda corrida `npx turbo run build` hit (si se ejecuta `turbo run build` real, no solo dry).
- **Archivos:** `turbo.json` JSON válido, `package.json` workspaces presente, `.gitignore` contiene `.turbo`.

## TOLERANCIAS

- Si `npx turbo` no está instalado global y `npx turbo --version` descarga (1 intento, ~10s), se acepta; si falla por red, se valida con `npm run build` con turbo.json presente como fallback (no bloquea).
- Si `turbo` en devDeps requiere `npm install` y la red falla, se deja `npx turbo` sin pinnear (no bloquea scaffolding).
- Si `npx turbo run build --dry=json` no soporta `--dry=json` en 2.10, usar `--dry` o `--dry-run` (tolerancia 1 flag).
- Si FULL build falla por `.next` stale o dev server, `taskkill /T /F` + `Remove-Item .next` y reintento 1 vez (precedente LECCIÓN).
- Si gates tardan >5 min (typecheck 60s + test 120s + build 2.6 min), se acepta pero no se deshabilitan tests.
- Max 3 fix attempts por item; si sigue RED => escalar a High Priority y no commitear.

## Riesgos / guardas

- **Cache inválida por env:** Prob Baja, Impacto Medio. Mitigación: `globalEnv: ["NODE_ENV"]` + `globalDependencies` con `.env.*local`, no incluir `DATABASE_URL`.
- **Break CI `loop_gate.py`:** Baja. `loop_gate.py` llama `npm run xxx` secuencial, no `turbo`; turbo es aditivo, no reemplaza scripts raíz.
- **Confusión `pipeline` vs `tasks`:** Baja. Usar `tasks` (v2 canónico); si se usa `pipeline`, turbo warn pero no fail.
- **`.turbo` en git:** Baja. Verificar `.gitignore` antes de commit.
- **Lock stale:** Si aparece lock ajeno para 184, CEDE y registra `[P] SKIP`.

## Esfuerzo estimado

Bajo — 1-3 archivos (1 nuevo `turbo.json` + 1-2 modificados `package.json`/`.gitignore`), 0 tests nuevos, config pura JSON, gates FULL ya verdes en 183. Justificación: scaffolding DX sin lógica de dominio, valida base para FutureMindMy C1.

## Prioridad

P1 — Alta (infra DX, bloquea escalar workspaces, pero no es P0 seguridad/gates RED).

## PREDICCIÓN (hipótesis antes de actuar)

- **turbo.json:** creado con 5 tasks (build/typecheck/lint/test/dev), `cache:true` en 4, `outputs` correctos, JSON válido.
- **package.json:** workspaces ya presente (no change) o `turbo` añadido a devDeps si se pinnea (1 línea).
- **Validación:** `npx turbo --version` => 2.10.12, `npx turbo run typecheck --dry=json` => 3 tasks listadas, `npm run typecheck` 0, `npm run build` 90+ páginas OK (segunda corrida cache hit si se prueba `turbo run build`).
- **Gates:** `typecheck` GREEN 0, `lint` GREEN 0, `test` GREEN 2974 (2724 core + 250 runtime), `build` GREEN 90+ páginas, `harness` 30/30.
- **Top riesgo:** flag `--dry=json` no soportado en 2.10 => fallback a `--dry` (1 retry).
- **Qué podría salir mal:** (1) `turbo.json` con `outputs` mal escrito causa `turbo` warn pero no fail; (2) `.gitignore` sin `.turbo` ensucia status pero no rompe gates; (3) `npm install` para pinnear turbo falla por red => se deja npx sin pinnear.
- **Mejora:** Si predicción se cumple, STATE 184 DONE con commit hash, loop-run-log [R] verde, y siguiente ciclo (content-factory/theatre wire) puede iniciar.

