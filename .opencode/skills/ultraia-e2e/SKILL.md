# ultraia-e2e — Testeo avanzado tipo Antigravity (Browser / Emulator / Docker)

Skill de testeo extremo-a-extremo "listo para usar": abre la app, la analiza en el
navegador (headless), en emulador (Android/iOS vía Expo) o en contenedor Docker, y reporta
errores de consola, DOM, rendimiento y captura. No necesita que el agente "mire" la pantalla:
produce evidencia máquina-legible.

## Cuándo usar
- "ábrelo en el navegador y dime si rompe", "haz E2E de la app", "test avanzado como Antigravity".
- Antes de cada release de `apps/web` (verificar que el dashboard/studios/gallery cargan sin
  errores de consola).
- Para validar el build de `apps/mobile` (Expo) en emulador.

## Backend disponible (elegir uno)
1. **Playwright MCP** (recomendado, ya cableado en `.mcp.json`):
   - El cliente MCP (opencode/Claude) levanta `@playwright/mcp` con `npx -y @playwright/mcp@latest --headless`.
   - Herramientas: `playwright_navigate`, `playwright_screenshot`, `playwright_evaluate`,
     `playwright_console_messages`, etc. Usarlas para abrir `http://localhost:3000`, capturar
     consola y hacer assertions de DOM.
2. **Script directo** `scripts/e2e-analyze.mjs` (Node ESM, fail-soft):
   - `node scripts/e2e-analyze.mjs --url http://localhost:3000 --out .ultraia/e2e`
   - Requiere `playwright` (`npm i -D playwright && npx playwright install chromium`).
   - Si no está instalado, imprime instrucciones y sale 2 (no rompe el pipeline).
3. **Browser-automation skill** (ya en el repo): carga una URL en headless y reporta
   errores de consola / requests fallidos / título / screenshot.
4. **gstack-browse** (si está disponible): QA visual con screenshots anotados.
5. **Task/browser-e2e.mjs** (iter-99): driver E2E propio con patchright.

## Modo Emulator (mobile)
- `npm run mobile` (Expo) → abrir en Android Emulator / iOS Simulator con Expo Go o
  `expo prebuild` + `npx expo run:android`. El analizador navega a la `EXPO_PUBLIC_API_URL`
  del móvil contra el backend web en `:3000`.

## Modo Docker (aislado)
- Para un entorno reproducible: `docker run --rm -p 3000:3000 <tu-imagen>` y apuntar el
  analizador a `http://localhost:3000`. El runner es headless y no necesita display.

## Contrato de salida (evidencia)
- `report.json`: `{ url, title, consoleErrors[], capturedAt }`.
- `screenshot.png`: captura de la página.
- Criterio de éxito: `consoleErrors.length === 0` y `title` no vacío.

## Notas
- Siempre matar dev servers (`next dev`) antes de `npm run build` para no corruptar `.next`.
- El analizador es determinista en su reporte; la captura depende del estado de la app.
