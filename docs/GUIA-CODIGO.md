# Guía del código UltraIa (para el dueño no técnico)

Este documento explica el proyecto en lenguaje claro, archivo por archivo. No es
técnico: cada término raro va en el **Glosario**. El objetivo es que entiendas
**qué existe, para qué sirve y en qué orden leerlo/crearlo**.

---

## 1. Qué es UltraIa
Una app web que **crea otros agentes de IA** a partir de una descripción. Tú
escribes qué debe hacer un agente, y el sistema genera su "plan" (prompt, modelo,
herramientas y cómo evaluarlo). Luego puedes usarlo en un chat y mejorarlo con
feedback. También tiene un **Studio** donde varias IAs trabajan juntas (web,
imagen, video, música, diseño).

## 2. Glosario
- **Proyecto / repo**: la carpeta completa del software.
- **Monorepo**: un repo con varios "paquetes" dentro (aquí: la app web y el núcleo).
- **Workspace (npm)**: forma de npm de decir "estos paquetes van juntos".
- **Framework**: andamio que da estructura lista (aquí usamos Next.js).
- **Componente**: una pieza de pantalla (botón, tarjeta, página). Se escribe en `.tsx`.
- **Prop**: un dato que se pasa a un componente (como un argumento a una función).
- **Hook** (`useState`): permite que un componente "recuerde" datos que cambian.
- **Ruta / API route**: una dirección `URL` interna (empieza por `/api/...`) donde la
  app pide o envía datos al servidor.
- **ORM (Prisma)**: puente que traduce código a lenguaje de base de datos.
- **Migración**: un "commit" de la estructura de la base de datos (la crea/la cambia).
- **Seed**: llenar la base de datos con datos de ejemplo.
- **Test / prueba**: programa pequeño que verifica que otro funciona.
- **Variable de entorno** (`.env`): configuración secreta (claves de API) fuera del código.

## 3. El stack (tecnologías y para qué)
- **Next.js + React**: lo que ves en el navegador (pantallas y botones).
- **Tailwind CSS**: estilos (colores, márgenes) sin hojas CSS aparte.
- **Vercel AI SDK + gateway**: conecta el chat con modelos de IA.
- **Prisma + SQLite**: guarda usuarios, agentes y evaluaciones en una base de datos local.
- **@google/stitch-sdk**: genera diseño de pantallas desde texto (Google Stitch).
- **lucide-react**: iconos. **react-resizable-panels**: paneles que se ajustan.
- **bcryptjs**: protege contraseñas. **zod**: valida formularios.

## 4. Mapa de carpetas
```
UltraIa/
  apps/web/            -> la APP (lo que ves en el navegador)
    src/app/           -> pantallas y rutas API
    src/components/    -> piezas reutilizadas (botones, header)
    src/lib/           -> utilidades y la carpeta shared/ (copias explicadas)
    src/components/app-shell/ -> shell IDE (sidebar + nav)
  packages/core/       -> LOGICA pura (sin pantallas)
    src/ai/            -> IA (gateway, modelo, esquemas, bucle)
    src/domain/        -> reglas de negocio (crear/mejorar/evaluar agentes)
    src/tools/         -> herramientas (web, imagen, video, musica, stitch)
    src/auth/          -> login/contraseña
    src/db/            -> conexion a la base de datos
    prisma/            -> esquema de la BD + seed
  docs/                -> guias y mockups (roadmap-mockup.html)
  scripts/             -> hook de documentacion + instalador
```

## 5. Ruta de creación/archivo a archivo (orden sugerido para entender)
### Nivel 0 — Configuración (el "suelo")
1. `package.json` (raíz) — define los comandos `dev`, `build`, `test`, `db:migrate`.
2. `packages/core/prisma/schema.prisma` — define las tablas de la base de datos.
3. `apps/web/next.config.ts` — configura Next.js.
4. `.env` — claves secretas (DATABASE_URL, STITCH_API_KEY, GEMINI_API_KEY).

### Nivel 1 — Núcleo (`packages/core`)
5. `src/db/client.ts` — abre la conexión con la base de datos.
6. `src/auth/session.ts`, `password.ts`, `apikey.ts` — login y seguridad.
7. `src/ai/gateway.ts` — puerta a los modelos de IA.
8. `src/ai/llm.ts` — llama al modelo de lenguaje.
9. `src/ai/schemas.ts` — formato de los "borradores" de agente.
10. `src/ai/loop.ts` — bucle de mejoras del agente.
11. `src/domain/blueprint.ts` — crea un agente desde una descripción.
12. `src/domain/improve.ts`, `eval.ts`, `feedback.ts`, `versions.ts` — mejorar/evaluar.
13. `src/tools/web.ts`, `image.ts`, `video.ts`, `music.ts`, `stitch.ts` — cada herramienta.
14. `src/index.ts` — lo que la web puede importar del núcleo.

### Nivel 2 — App web (`apps/web`)
15. `src/lib/server/context.ts` — dice quién es el usuario actual.
16. `src/components/ui/*` — botones, tarjetas, inputs reutilizados.
17. `src/components/marketing-header.tsx` — barra superior común.
18. `src/app/layout.tsx` — estructura base de cada pantalla.
19. `src/app/page.tsx` — pantalla de inicio.
20. `src/app/(auth)/login`, `register` — iniciar sesión / registrarse.
21. `src/app/(app)/dashboard` — panel principal tras entrar.
22. `src/app/(app)/studio/studio-client.tsx` — el Studio (varias IAs juntas).
23. `src/app/(app)/agents/*` — crear, ver y mejorar agentes.
24. `src/app/(app)/roadmap/page.tsx` — el roadmap técnico (nuevo).
25. `src/app/api/*` — las "puertas" internas que usan las herramientas y el chat.

### Nivel 3 — Datos y guías
26. `apps/web/src/components/app-shell/nav.tsx` — navegación del sidebar.
27. `apps/web/src/lib/shared/*` y `packages/core/src/shared/*` — copias explicadas.
28. `docs/roadmap-mockup.html` — mockup imprimible a PDF.
29. `DOCS_TODO.md` — pendientes de documentar (generado por el hook).

## 6. Cómo correr el proyecto
```
npm install
npm run db:migrate      # crea la base de datos
npm run dev             # abre http://localhost:3000
```
Para verificar: `npm run typecheck && npm run lint && npm run test && npm run build`.

## 7. El "loop" de documentación
Tras cada `git commit`, un hook (`scripts/doc-reminder.mjs`) anota los archivos
`.ts/.tsx` tocados en `DOCS_TODO.md`. Para documentar uno, pide:
**"explica &lt;archivo&gt;"** (usa la skill `explain-code`), que agrega comentarios
estilo Better Comments sin tocar la lógica. Para activar el hook: `node scripts/install-hooks.mjs`.
