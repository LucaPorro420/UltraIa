# .opencode/skills-avoid/ — Cuarentena de skills NO descubiertos

> Creada en la iteración 62 (18/08/2026, ciclo PIVR). Ver `docs/SKILLS-INVENTARIO.md`.

Esta carpeta contiene **copias de referencia** de SKILL.md globales que **NO deben
cargarse ni usarse** en UltraIa. opencode NO descubre skills en esta carpeta (el
patrón de descubrimiento es `.opencode/skills/<name>/SKILL.md`; `skills-avoid` es
un directorio hermano, no un skill). Los skills quedan disponibles como referencia
fuera de la ruta de carga, sin borrarlos del sistema global.

## Reglas

- **NO** mover/copiar skills aquí con la intención de usarlos — esto es cuarentena.
- **NO** crear `SKILL.md` en la raíz de esta carpeta (la convertiría en skill si
  opencode cambiara su patrón de descubrimiento a `skills-avoid/*/SKILL.md`; hoy no
  lo hace, pero la defensa en profundidad es mantener solo subcarpetas planas).
- Para restaurar un skill: copiar de vuelta a `~/.claude/skills/gstack/<name>/` o
  `~/.agents/skills/<name>/` (ver `manifest.json` para la ruta original exacta).

## Estructura

```
.opencode/skills-avoid/
  README.md          <- este archivo
  manifest.json      <- inventario: motivo + ruta original + restauración
  <skill-name>/      <- copia de referencia del SKILL.md evitado
```