# Genesis Projects — cada proyecto es un `genesis.json`

Plataforma base reutilizable: un nuevo proyecto NO es código nuevo, es un nuevo
manifest que el motor existente (`npm run genesis`, `scripts/genesis-run.ts`)
sabe ejecutar.

## Crear un proyecto

```bash
py -3.12 scripts/genesis.py project new terra-viva --name "Terra Viva"
# → genesis/projects/terra-viva/genesis.json (instancia del template)
```

## Validar

```bash
py -3.12 scripts/genesis.py manifest genesis/projects/terra-viva/genesis.json
```

## Ejecutar contra un proyecto

El motor lee el manifest por ruta:

```bash
node_modules/.bin/vite-node.cmd scripts/genesis-run.ts --manifest genesis/projects/terra-viva/genesis.json
```

Reglas: slug `^[a-z0-9][a-z0-9-]{1,63}$` (mismo patrón que los módulos del
runtime); el template exige `project.id` y `objective.primary` — sin eso no
valida. Los proyectos heredan las reglas de seguridad de la raíz `genesis.json`
(push humano, staging explícito, gates antes de commit).
