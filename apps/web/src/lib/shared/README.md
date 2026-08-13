# Carpeta `shared/` (código reutilizado, comentado)

Esta carpeta es una **guía de referencia**. Contiene copias del código que se
repite en varias partes del proyecto, escritas de nuevo aquí **solo para explicarlas**,
con comentarios en inglés estilo *Better Comments* y notas en español.

**No se usa en la app.** El código real vive en sus archivos originales
(anotados en cada archivo de esta carpeta). No cambiamos nada del código real:
esto es solo para que entiendas qué hace y por qué se repite.

## Archivos
- `http.ts` → `postJson` / `getJson`: cómo habla la app con sus propias API.
- `ui.tsx` → `StudioCard`, `inputCls`, `btnCls`, `glow-*`: piezas visuales del Studio.
- `components-reference.md` → `MarketingHeader` y los primitivos de UI (Button, Card, Input…).

## Glosario rápido para ti
- **Componente**: una pieza de pantalla (botón, tarjeta, página). En React se escribe en `.tsx`.
- **Prop (property)**: un dato que se pasa a un componente, como un argumento a una función.
- **Hook** (`useState`): forma de que un componente recuerde datos que cambian (ej. lo que escribes).
- **API route**: una dirección `URL` interna (empieza por `/api/...`) donde la app pide datos.
