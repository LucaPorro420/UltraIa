# Instalador y Actualización (Fase A)

`Installer` (`packages/runtime/src/installer.ts`). `exec` inyectable (por defecto `child_process`),
lo que permite testear sin procesos reales y adaptar el binario correcto por plataforma.

> Cross-ref: versión canónica verificada en `desktopFase/INSTALLER.md` (mismo contrato).
> Historial de movimientos y totales: `docs/HISTORIAL-PROYECTO.md`.

## Operaciones

| Operación | Qué hace |
|---|---|
| `install` | Crea `.ultraia/` (9 dirs: config, runtime, logs, cache, memory, modules, models, projects, state), instala deps del runtime (`npm install`), verifica toolchains (`node`, `python`) y escribe `install.json` |
| `uninstall` | Detiene el runtime y elimina `.ultraia/` (solo si no hay proyectos guardados; safety check) |
| `repair` | Reinstala deps + repara permisos/corrupción de estado |
| `update` | Backup del estado actual → aplica nueva versión → **rollback automático si falla** (restaura el backup y deja el runtime en versión anterior) |
| `backup` | Snapshot de `install.json` + estado (memoria/config) en `.ultraia/backups/` |

## Seguridad

- **Fail-fast**: cualquier comando fallido (exit code ≠ 0) aborta la operación; en `update` dispara
  rollback inmediato.
- `npm install --no-audit --no-fund` en modo no interactivo (CI/determinista).
- Secrets **no** se escriben en `install.json` — solo referencias (env/keychain).
- En Windows los bins son `npm.cmd`/`python.exe` — el `exec` resuelve la extensión según `os.platform()`.

## Notas de test

- `fakeExec` matchea por **args** (`'install'`) no por substring `'npm install'` (el bin real es
  `npm.cmd`, el substring nunca aparece).
- `update` con fallo simulado → versión anterior restaurada, runtime funcional.