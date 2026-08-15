# INSTALLER.md — Instalador local

`Installer` en `packages/runtime/src/installer.ts`. Operaciones: `install`, `uninstall`,
`repair`, `update`. Nunca destructivo: `uninstall` conserva datos del usuario salvo
`keepData:false`; `update` hace backup y rollback si algo falla.

## Layout `.ultraia/`

```
.ultraia/
├── config/    config.json (secretos enmascarados en disco)
├── runtime/   estado de ejecución
├── logs/
├── cache/
├── memory/    entries.json (memoria del runtime)
├── modules/   payloads instalados (Fase E)
├── models/    modelos locales
├── projects/
├── state/     install.json (registro idempotente)
└── backups/   <ts>/ (dev.db, config, memory)
```

## Flujo de `install()`

1. **prereqs** — node >= 20 (obligatorio), python (opcional), vía `exec` inyectable.
2. **directories** — `UltraPaths.ensure()` (9 dirs).
3. **env** — copia `.env.example` → `.env` SOLO si no existe; NUNCA sobrescribe.
4. **deps** — `npm install` si `node_modules` ausente (patrón start.py).
5. **database** — `npm run db:migrate` si `packages/core/prisma/dev.db` ausente.
6. **config** — `installedAt` + `installVersion` (idempotente).
7. **state** — escribe `state/install.json` (idempotente).

Cualquier paso fallido → `{ ok:false, steps, error }` + evento `install.failed` (fail-fast).

## Backup / rollback

- `backup()` → `.ultraia/backups/<timestamp>/` con `dev.db`, `config.json`, `entries.json`
  (solo lo existente).
- `update()`: backup → install → si falla, `restoreBackup()` (restaura dev.db) y
  devuelve `rolledBack: true`.
- `repair()`: backup → install (nunca toca `.env` existente).

## Opciones

```ts
new Installer({
  projectRoot, ultraiaRoot,
  envExamplePath?,   // default <projectRoot>/.env.example
  exec?,             // runner inyectable (tests) — default spawn real (npm.cmd en win)
  offline?,          // true → salta pasos de red (deps)
  logger?, events?,
});
```

`install({skipDeps?, skipDb?})` permite omitir pasos (instalaciones parciales).

## Notas

- Windows: `npm.cmd` / `node.exe` (compat con start.py).
- `install` es idempotente entre corridas (env/deps/db/config/state respetan lo existente).
- Fase E: firma + canal de actualización reales (NSIS/MSI).