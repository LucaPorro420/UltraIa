# Plan loop-123 - React 19 idiom adoption (use() para contexto)

## Contexto
- Peticion usuario: "mejora el react e proyecto total para react 19.0 version en conjunto
  con otros agente e procesos" + "continua con todo".
- Auditoria previa (loop-122): el proyecto YA esta en React 19.2.3 (web+mobile, Next 15.3.3),
  usa `useActionState` en 5 formularios, 0 `forwardRef`, 0 `React.FC`/`defaultProps`,
  `ref` como prop ya aplicado en label/textarea. "19.0" = linea React 19 (NO downgrade a
  19.0.0, que romperia Expo/RN 0.86).
- Unico patron pre-19.0 restante: `useContext` en `components/ui/tabs.tsx`. React 19 canoniza
  `use(Context)` para leer contexto durante el render (equivalente, idiomatico).

## Objetivo
- Migrar `tabs.tsx` de `useContext(TabsCtx)` a `use(TabsCtx)` (React 19 context-reading idiom).
- Dejar intacto el WIP de la sesion concurrente (connections/*, _diag.ts, DOCS_TODO.md).

## ARCHIVOS A TOCAR
- `apps/web/src/components/ui/tabs.tsx` (import `use` + 2 reemplazos).
- `.opencode/plans/loop-123-react19-idioms.md` (este plan).

## NO-hacer
- No tocar `apps/web/src/app/(app)/connections/*`, `packages/core/src/_diag.ts`,
  `DOCS_TODO.md`, `Act-UltraIA/`, `InfoPeticion.txt` (WIP ajeno de la sesion concurrente).
- No hacer downgrade de version de React.
- No push (requiere aprobacion humana).

## Verificacion (gates CI en orden, dev server muerto)
- `npm run typecheck` -> `npm run lint` -> `npm run test` -> `npm run build`.
- WIP ajeno (connections-client.tsx, api/connections/route.ts, _diag.ts) en cuarentena
  durante los gates (hash-check restore) para no ensuciar el resultado.
- Prediccion: GREEN en las 4 gates para mis cambios.

## Riesgos
- `use(Context)` sin provider devuelve defaultValue (igual que useContext) -> sin cambio de
  comportamiento.
- Carrera con sesion concurrente: ella edita connections/* (no tabs.tsx) -> sin conflicto.
