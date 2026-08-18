# repomix — paquete del repo para LLMs (enlaces.txt L825)

[repomix](https://github.com/yamadashy/repomix) (MIT, yamadashy/repomix) empaqueta el
repositorio completo en UN archivo (`repomix-output.xml`) listo para pegar como contexto
en cualquier LLM (ChatGPT/Claude/Gemini) o para subir a repomix.com. Sin configuración
manual: respeta `.gitignore`, detecta secretos y excluye binarios.

## Uso

```powershell
npm run repomix            # paquete completo de los directorios de código
npx repomix --help        # todas las opciones
```

El script raíz (`package.json`) ya incluye los directorios de código:

```json
"repomix": "repomix --include \"packages/core/src,packages/runtime/src,apps/web/src,apps/mobile/src,scripts,Task,start.py\""
```

Salida: `repomix-output.xml` en la raíz (~505k tokens para el repo completo, 336 archivos).
NO se commitea (`.gitignore`: `repomix-output.*`).

## Comandos útiles

| Comando | Efecto |
|---|---|
| `npx repomix` | paquete completo (todo el repo, respetando .gitignore) |
| `npx repomix --include "packages/core/src"` | solo core |
| `npx repomix --style markdown` | formato Markdown en vez de XML |
| `npx repomix --compress` | modo comprimido (remueve código redundante; experimental) |
| `npx repomix --remove-comments` | quita comentarios (reduce tokens) |
| `npx repomix --output repomix-core.xml` | nombre de salida custom |
| `npx repomix --config repomix.config.json` | configuración persistente |
| `npx repomix --init` | genera `repomix.config.json` con todas las opciones |

## Seguridad

repomix corre un security check automático y EXCLUYE archivos sospechosos de secretos
(por ejemplo `packages/core/src/tools/slack.test.ts` contiene un token de prueba "Bearer
xoxb-..." y es excluido por defecto). Antes de compartir el paquete con un tercero:
revisar `repomix-output.xml` manualmente y usar `--remove-comments` si hace falta.

## Cuándo usarlo en UltraIa

- **Contexto completo para el modelo**: cuando una sesión nueva necesita ver todo el
  código (core + runtime + web + mobile) sin leer archivo por archivo.
- **Pipelines de agentes**: el archivo puede pasarse como adjunto a un LLM externo o a
  `skill_*` para tareas de refactor global (typecheck/lint/test/build ya garantizan
  integridad después).
- **No sustituye a**: `learning/` (memoria verificada), `AGENTS.md` (reglas operativas) ni
  `STATE.md` (backlog) — repomix es SOLO código.

## Notas

- Integrado el 18/08/2026 (iteración loop-46 F2): `npm i -D repomix` + script npm +
  `.gitignore`. Verificado: `npm run repomix` genera el paquete completo (336 archivos,
  505k tokens) con security check activo.
- La salida exacta cambia con cada commit — regenerar antes de usarla.
