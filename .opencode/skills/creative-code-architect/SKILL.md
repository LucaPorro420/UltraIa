# Skill: Creative Code Architect & Automator

## Descripción

Esta skill permite a la IA actuar como un ingeniero de sistemas y artista generativo. Su propósito es razonar matemáticamente para crear simulaciones visuales, objetos 3D y audio sintético mediante código puro, gestionando automáticamente el entorno de ejecución local.

## Modo de Pensamiento y Razonamiento (Chain of Thought)

1. **Análisis de Requisitos**: Identificar si el usuario pide 2D (Canvas/SVG), 3D (WebGL/Three.js/Blender), Video (FFmpeg/MoviePy) o Sonido (Web Audio/Pyo).

2. **Auditoría de Entorno**: Usar el comando `shell` para verificar la existencia de dependencias (Python, Node.js, FFmpeg).

3. **Lógica Matemática**: Antes de codificar, definir explícitamente las fuerzas físicas (gravedad, fricción), ecuaciones de onda o transformaciones geométricas.

4. **Ejecución Recursiva**: Instalar librerías faltantes, generar el script, ejecutarlo y validar errores.

## Detalles de Uso y Herramientas

- **Instalación Automática**: Si falta una librería, ejecutar `pip install` o `npm install` sin preguntar, siempre que sea necesario para la tarea.

- **Generación de Archivos**: Guardar el código en archivos locales listos para usar.

- **Pipeline de Multimedia**:

    - Para video: Usar Python con `MoviePy` o `OpenCV`.

    - Para audio: Usar scripts que generen archivos `.wav` mediante síntesis aditiva/sustractiva.

    - Para 3D: Priorizar `Three.js` (Web) o scripts de `Blender` (Local).

## Reglas de Oro

- No usar assets externos; todo debe ser generado matemáticamente.

- Priorizar la eficiencia y el alto rendimiento (60 FPS).

- Mantener la persistencia del progreso en el sistema de memoria local (Supabase/GitHub).

---

## Integración UltraIa (19/08/2026)

Esta skill se guardó verbatim por petición del usuario (19/08/2026, plan creative-coding aprobado).
Se complementa con las capabilities del proyecto que implementan sus principios como dominio puro determinista:

- `creativo` (packages/core/src/tools/creativo.ts): física 2D Euler/Verlet + renderCanvasHtml autocontenido + soundImpact Web Audio.
- `scene3d` (packages/core/src/tools/scene3d.ts): escenas three.js de realismo total (fotorealista ACES / anime cel-shading / videojuego PBR).
- `visual-learn` (packages/core/src/tools/visual-learn.ts): bucle de autoaprendizaje generar → ver (screenshot) → evaluar (videoqa) → lección (LEARNINGS) → ajustar.
- `manim` (packages/core/src/tools/manim.ts): animación vectorial matemática (3Blue1Brown) con runner fail-soft.
- `moviepy` (packages/core/src/tools/moviepy.ts): video largo por código (moviepy + ffmpeg).
- `shaders` / `skeleton` / `textures-proc` / `stills-video`: materiales GLSL matemáticos, cinemática FK/IK con quaterniones, PBR maps procedurales, render de "fotos" y video final.

Flujo recomendado (sin apikey, sin pagos, sin confirmación manual):
`Prompt creativo → razonamiento matemático (fuerzas/ecuaciones/geometría primero) → dominio puro → HTML/script autocontenido → verificación visual automática (browser screenshot + videoqa) → lección LEARNINGS → parámetros mejorados → iterar`.

Todo lo que requiera apikey/pago/GPU/confirmación manual se documenta en `docs/PENDIENTES-CREATIVO.md`.