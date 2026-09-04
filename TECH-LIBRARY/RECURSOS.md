# Recursos verificados — Tech Library UltraIa

> **Verificado:** 2026-09-04 · **Método:** YouTube oEmbed (título/autor reales) + curl HEAD
> (200 final con redirects) + Spotify oEmbed + RSS (título del show + último pubDate).
> **Regla:** ninguna URL entra sin 200. Títulos de videos = los devueltos por oEmbed.
> Límite honesto: oEmbed no expone fecha del video → año solo si constaba en la búsqueda.

## Videos por tecnología (24 verificados; repomix sin video —herramienta pequeña—)

| Tech | Título (oEmbed) | Autor (oEmbed) | URL | Nota |
|---|---|---|---|---|
| nextjs-15 | Curso completo de Next.js 14 con App Router | Goncy | https://www.youtube.com/watch?v=s5jPwPZrJhw | ES · v14, base App Router vigente |
| react-19 | CURSO REACT.JS - Aprende desde cero | midulive | https://www.youtube.com/watch?v=7iobxzd_2wY | ES |
| typescript-5 | Tutorial práctico: React y TypeScript paso a paso | midulive | https://www.youtube.com/watch?v=4lAYfsq-2TE | ES |
| tailwind-v4 | Tailwind CSS Tutorial for Beginners (2024) | Lukas \| Web Development & Design | https://www.youtube.com/watch?v=DenUCuq4G04 | EN · con React+Vite |
| vercel-ai-sdk | Vercel AI SDK Crash course 2026 | Stav | https://www.youtube.com/watch?v=bx3bBKtKb8c | EN · 2026 |
| zod | Zod Goes Where TypeScript Can't | Theo - t3.gg | https://www.youtube.com/watch?v=o4h8PUVy5J8 | EN |
| nodejs-patterns | Nodejs y Mongodb: aplicación completa (Login, Registro, CRUD) | Fazt | https://www.youtube.com/watch?v=-bI0diefasA | ES |
| prisma-sqlite | Prisma ORM Full Course 2025 | PedroTech | https://www.youtube.com/watch?v=gimSKEsWYb4 | EN · con Next.js 15 |
| ai-sdk-providers | Build agents with Gemini API | Google for Developers | https://www.youtube.com/watch?v=OdrOmc_RX8A | EN · 2026, oficial |
| llm-agents | Build an AI Agent with TypeScript, Vercel AI SDK & MongoDB Atlas | MongoDB for Developers | https://www.youtube.com/watch?v=Xgsz1OciANI | EN · 2026 |
| expo-react-native | Building a Twitter Clone with React Native from Scratch | notJust.dev | https://www.youtube.com/watch?v=sNixa64aG9Y | EN · con Expo Router |
| gsap | Introducing ScrollTrigger for GSAP | GSAP Learning | https://www.youtube.com/watch?v=X7IBa7vZjmo | EN · canal oficial |
| threejs | Build a Mindblowing 3D Portfolio Website (Three.js Beginner's Tutorial) | Fireship | https://www.youtube.com/watch?v=Q7AOvWpIVHU | EN · 2025 |
| lottie | Getting Started With Lottie Animation \| Lottiefiles | Envato Tuts+ | https://www.youtube.com/watch?v=Nesm2FTWo9s | EN · 2024 |
| vitest | Vitest Crash Course (Tutorial from WebDevSimplified) | MasterDotDev | https://www.youtube.com/watch?v=qtm3wjM2eGI | EN · 2026 |
| playwright | Playwright Tutorial for Beginners (2025) | WishInfinite | https://www.youtube.com/watch?v=f0AwyYAAu1g | EN · 2025 |
| cloudflare-workers | Cloudflare Workers Explained | Cloudflare Developers | https://www.youtube.com/watch?v=WDhruDqb5nM | EN · 2026, oficial |
| docker | Docker, curso práctico para principiantes (desde Linux) | Fazt Code | https://www.youtube.com/watch?v=NVvZNmfqg6M | ES |
| websocket | Realtime Chat With Users & Rooms - Socket.io, Node & Express | Traversy Media | https://www.youtube.com/watch?v=jD7FnbI76Hg | EN |
| webrtc | WebRTC in 100 Seconds | Fireship | https://www.youtube.com/watch?v=WmR9IMUD_CY | EN |
| auth-patterns | JWT Authentication Tutorial - Node.js | Web Dev Simplified | https://www.youtube.com/watch?v=mbsmsi7l3r4 | EN · 1.2M vistas |
| git-workflows | Curso GIT y GITHUB - Tutorial desde CERO (playlist) | s/d (playlist) | https://www.youtube.com/playlist?list=PLQxX2eiEaqby-qh4raiKfYyb4T7WyHsfW | ES · página 200 |
| npm-workspaces | Building a MonoRepo with NPM Workspaces | Frontend Series | https://www.youtube.com/watch?v=4DOBsEGyKF0 | EN |
| eslint-prettier | How to Set Up ESLint 9 with Prettier (Flat Config) | Leela Web Dev | https://www.youtube.com/watch?v=IcCHLLEtiHM | EN · 2025 |

## Docs oficiales + webs interactivas (todas HTTP 200 el 2026-09-04)

Sustituciones honestas tras verificar: `ai-sdk-core/providers` → `ai-sdk.dev/providers/ai-sdk-providers`
(la vieja da 404); GreenSock CodePen → `gsap.com/resources` (CodePen bloquea bots: 403);
`lottiefiles.com` → `docs.lottiefiles.com` (home bloquea bots: 403); `npmjs.com` →
`docs.npmjs.com` (home: 403); `labs.play-with-docker.com` verificado por GET (HEAD da 405).

| Tech | Docs oficial | Web interactiva extra |
|---|---|---|
| nextjs-15 | https://nextjs.org/docs | https://nextjs.org/learn |
| react-19 | https://react.dev | https://es.react.dev/learn |
| typescript-5 | https://www.typescriptlang.org/docs/ | https://www.typescriptlang.org/play |
| tailwind-v4 | https://tailwindcss.com/docs | https://play.tailwindcss.com (+ curso ES de pago: https://midu.dev/curso/tailwind-desde-cero) |
| vercel-ai-sdk | https://sdk.vercel.ai/docs | https://vercel.com/templates/ai |
| zod | https://zod.dev | https://github.com/colinhacks/zod |
| nodejs-patterns | https://nodejs.org/en/docs | https://nodejs.org/en/learn |
| prisma-sqlite | https://www.prisma.io/docs | https://github.com/prisma/prisma-examples |
| ai-sdk-providers | https://ai-sdk.dev/providers/ai-sdk-providers | https://aistudio.google.com |
| llm-agents | https://sdk.vercel.ai/docs/ai-sdk-core/agents | https://github.com/openai/openai-cookbook |
| expo-react-native | https://docs.expo.dev | https://snack.expo.dev (+ proyecto guiado: https://www.notjust.dev/projects/twitter) |
| gsap | https://gsap.com/docs/v3/ | https://gsap.com/resources/ |
| threejs | https://threejs.org/docs/ | https://threejs.org/examples/ |
| lottie | https://airbnb.io/lottie/ | https://docs.lottiefiles.com |
| vitest | https://vitest.dev | https://www.freecodecamp.org/news/how-to-test-react-applications-with-vitest/ |
| playwright | https://playwright.dev | https://trace.playwright.dev (+ curso MS Learn: https://learn.microsoft.com/en-us/training/modules/build-with-playwright/) |
| cloudflare-workers | https://developers.cloudflare.com/workers/ | https://workers.cloudflare.com/playground |
| docker | https://docs.docker.com | https://labs.play-with-docker.com |
| websocket | https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API | https://www.websocket.org/echo.html |
| webrtc | https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API | https://webrtc.github.io/samples/ |
| auth-patterns | https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html | https://jwt.io |
| git-workflows | https://git-scm.com/doc | https://learngitbranching.js.org (+ repo/libro: https://github.com/HolaMundoDev/mirepo) |
| npm-workspaces | https://docs.npmjs.com/cli/using-npm/workspaces | https://docs.npmjs.com |
| eslint-prettier | https://eslint.org/docs/latest/ | https://eslint.org/play |
| repomix | https://repomix.com | https://github.com/yamadashy/repomix |

## Podcasts / audios (shows 200 en Spotify oEmbed; RSS con pubDate sep-2026)

| Show | Idioma | URL | Evidencia frescura |
|---|---|---|---|
| Cosas de programadores (campusMVP) | ES | https://open.spotify.com/show/2X2Hz6UOD4L5Ob6bJLYUDW | episodios jun-2026 |
| Programar es una mierda | ES | https://open.spotify.com/show/6crvLebQZ7IS4WGpLPqudm | episodio jul-2025 |
| Programación en español (comunidad) | ES | https://open.spotify.com/show/5w0kyXLdWVvYaRfyBxbNUo | serie activa |
| Programación JS y Desarrollo Web con midudev | ES | https://open.spotify.com/show/1Et8hZk1DwKw6PtBFGpwSD | serie activa |
| Web Reactiva (web + IA) | ES | https://open.spotify.com/show/59878neWF4cPVmpPmvIZTF | serie activa (+ https://webreactiva.com) |
| Hablando de software (Thoughtworks España) | ES | https://open.spotify.com/show/24TQEIjtFNPA9cHDVZW8yK | episodio dic-2025 |
| Syntax | EN | https://syntax.fm (RSS: https://feed.syntax.fm/rss) | episodio 2-sep-2026 |
| Changelog Podcast | EN | https://changelog.com/podcast (RSS: https://changelog.com/podcast/feed) | episodio 3-sep-2026 |

## Libros
Ya cubiertos: 115 libros en la pestaña Biblioteca + mapa por sección en cada detalle tech
(`BOOK_TECH_MAP`). No se duplican aquí.
