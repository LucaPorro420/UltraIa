# RAZONAMIENTO-TESTTASKSKILLS — reel Db_CpPGJxpE (Kage, Three.js scroll world)

Análisis del enlace L821 de `enlaces.txt` (verificado 18/08/2026 vía r.jina.ai,
fuente cruda en `learning/sources/kage-threejs.md`).

## Resumen

El reel es de **techinsixty** (13/08/2026) y muestra **"Kage"**, la landing page
open-source de **Meng To** construida con Three.js: un mundo 3D que avanza con el
scroll, hojas cayendo, pointer trail, <1MB de Three.js+código (~3MB con PNG HQ),
y "reusable AI coding skills" para construir ese tipo de experiencias.

## Análisis técnico

- **Arquitectura**: una sola experiencia 3D continua en vez de secciones HTML
  independientes — el scroll es el controlador del mundo (camera moves through
  the scene). Presupuesto de peso extremadamente bajo (<1MB JS+Three).
- **Presupuesto de rendimiento**: PNG HQ assets ≈ 3MB total — la regla de oro
  para una landing 3D: Three.js comprimido es barato; los assets son el costo.
- **Patrón de distribución**: código abierto + skills de IA reutilizables +
  "Comment Repo for link" — mismo embudo que VidRush/Abacus (recurso → lista →
  producto). Valida el enfoque de captación del proyecto.

## Mapeo implementado / pendiente en UltraIa

| Principio | Implementado | Archivo / capability |
|---|---|---|
| Three.js en la landing | ✔ | `apps/web/src/components/aurora/aurora-canvas.tsx` (dynamic import ssr:false, shader respeta prefers-reduced-motion) |
| Shaders GLSL propios | ✔ | capability `codevfx` (9 efectos con GLSL hand-written) |
| Movimiento scroll-linked | ✔ (parcial) | roadmap con DrawSVGPlugin + ScrollTrigger (`top 80%`, once) |
| Mundo 3D por sección | ✖ pendiente | Watch List — landing scroll-world con Kage como referencia |
| Skills reutilizables de IA | ✔ | pipeline `skill_*` (plan→build→test→review→ship→simplify) + 40+ capabilities |
| Assets livianos | ✔ | bundle audit en cada build (First Load JS ~102-201 kB por página) |

## Decisión

Verificado y documentado. La extensión natural (landing mundo 3D completo) queda en
**Watch List** — requiere decisión de producto del usuario y no forma parte de la
ronda de higiene/consolidación actual (18/08/2026, loop-46).
