# Componentes reutilizados en la app (web)

Estos componentes ya existen en el proyecto y se usan en muchas pantallas. Esta
nota solo los **explica y da su ruta real**; no se cambia nada.

## `MarketingHeader` — `apps/web/src/components/marketing-header.tsx`
Barra superior común (logo "UltraIa", enlace a Studio, nombre del usuario, botón
Log out). Se usa en 4 páginas:
- `app/page.tsx` (inicio)
- `app/explore/page.tsx`
- `app/a/[id]/page.tsx` (agente público)
- `app/(app)/studio/page.tsx`

Recibe una prop `user` (puede ser `null` en páginas públicas).

## Primitivos de UI (estilo "shadcn") — `apps/web/src/components/ui/`
Son bloques básicos de pantalla, reutilizados en casi todos los formularios:
- `button.tsx` → `<Button>` (botones).
- `card.tsx` → `<Card>` (cajas/contenedores).
- `input.tsx` → `<Input>` (campo de texto de una línea).
- `label.tsx` → `<Label>` (etiqueta de un campo).
- `textarea.tsx` → `<Textarea>` (campo de texto multilínea).
- `badge.tsx` → `<Badge>` (etiqueta pequeña, ej. "PENDING").

## Otros componentes compartidos — `apps/web/src/components/`
- `agent-chat.tsx` → chat del agente (página de un agente).
- `public-agent-chat.tsx` → chat para agentes públicos.
- `feedback-control.tsx` → botones de feedback (👍/👎) tras cada respuesta.
- `clone-agent-button.tsx` / `delete-agent-button.tsx` → acciones de copiar/borrar.
