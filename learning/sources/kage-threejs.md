# Kage — Three.js scroll-driven landing (reel Db_CpPGJxpE, L821)

Fuente: https://www.instagram.com/reel/Db_CpPGJxpE/ (techinsixty, 13/08/2026).
Verificado vía r.jina.ai el 18/08/2026.

## Qué es

"Kage" — landing page open-source de Meng To ("Where stillness reveals the unseen"):
cada sección del sitio te lleva a través de un mundo 3D mientras haces scroll.

## Características (del reel)

- Scroll-driven 3D world experience (el scroll navega el mundo).
- Built with Three.js.
- Falling leaves animation.
- Interactive pointer trail effects.
- Under 1MB de Three.js y código (~3MB incluyendo assets PNG HQ).
- Open-source landing page + "reusable AI coding skills" para construir
  mundos 3D scroll y efectos interactivos.
- Comentar "Repo" para el link (patrón de captación clásico).

## Relevancia para UltraIa

Ya cubierto parcialmente:

| Feature Kage | UltraIa hoy | Estado |
|---|---|---|
| Scroll-driven 3D | `apps/web/src/components/aurora/aurora-canvas.tsx` (WebGL aurora hero, ShaderMaterial simplex noise, prefers-reduced-motion) | implementado (hero) |
| Three.js + shaders | capability `codevfx` (9 efectos GLSL, HTML canvas autocontenido) | implementado |
| Efectos interactivos pointer | capability `vfx` (reframe/upscale/rotoscope plan) + `.card-glow-hover` | parcial |
| "AI coding skills" reutilizables | skills de agente `skill_*` (plan/build/test/review/ship/simplify) + 40+ capabilities | implementado |
| Landing mundo 3D completo por sección | roadmap animado (DrawSVGPlugin + ScrollTrigger) | parcial — NO mundo 3D por sección |

## Aplicación pendiente (Watch List)

- Landing "scroll-driven world" completo por sección con Three.js (usar Kage como
  referencia visual): el hero aurora ya existe; la extensión natural es un
  scroll-world para /roadmap o /recursos con los diagramas `diagram` (docs/diagrams/)
  como puntos del mundo. No es parte de la ronda de higiene actual — requiere
  decisión de producto del usuario.
- Nota: el patrón de "reusable AI coding skills" de Meng To valida el enfoque del
  pipeline `skill_*` + `learning/sources/` del proyecto (nada que cambiar).

## Veredicto

Verificado y documentado. Sin código accionable en esta iteración (la landing
scroll-world es feature de UI grande — Watch List, decisión de producto).
