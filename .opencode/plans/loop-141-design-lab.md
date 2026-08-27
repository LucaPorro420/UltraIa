# Plan — Design Lab (extensión de /lab)

## Contexto
Usuario pide un frontend de alto alcance con flujo de diseño **visual e interactivo** (ver,
prototipar, rediseñar sin fricción). El repo ya tiene `/lab` como navegador de demos de
capacidades y el item de nav ya existe (`components/ide/nav-items.ts` línea 37). Falta convertir
`/lab` en un **Design Lab** real: tokens en vivo + galería del UI kit + prototipos navegables.

## Objetivo
Extender `apps/web/src/components/lab-client.tsx` para que `/lab` muestre tres zonas:
1. **Design Tokens** (lee CSS vars de `globals.css` en cliente, swatches + fuentes).
2. **UI Kit Gallery** (todos los componentes de `components/ui/*` con variantes).
3. **Prototipos en vivo** (los 4 demos existentes de capabilities: SDF, CodeVFX, Imaging, Growth).

## Archivos a tocar (solo 1)
- `apps/web/src/components/lab-client.tsx` — reescritura (puro cliente, sin cambios de server/API).

NO se tocan: `page.tsx`, `nav-items.ts` (ya linkea /lab), `globals.css`, `components/ui/*`.

## Recursos / presupuesto
- Bajo: solo UI, sin nuevas deps, sin llamadas de red.
- Reutiliza componentes existentes del UI kit y tokens ya definidos.

## NO-hacer
- No tocar el shell, la API ni el dominio.
- No agregar dependencias nuevas.
- No romper los demos existentes (SDF/VFX via srcDoc iframe).

## Criterios de verificación
- Scoped: `npm run typecheck` (web) + `npm run lint` (web).
- FULL antes de commit: typecheck → lint → test → build (matar dev server antes de build).
- Manual: `/lab` carga las 3 zonas sin error de consola.

## Riesgos / mitigación
- Hidration mismatch al leer CSS vars → leer en `useEffect` (post-mount), estado inicial vacío.
- Props de componentes → verificadas contra los fuentes de `components/ui/*`.

## Esfuerzo / prioridad
- P2 · ~1 archivo · bajo riesgo.
