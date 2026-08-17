##Toma elproyecto y utiiza el orquestador para pedirle que realice esta accion y me devuelva los resultados en una carpeta aparte creada en el inicio de ultraia llamada resultTask.
##Ten en cuenta que los videos, imagenes, sonidos y demas que te proporcionare en la carpeta Task\Content seran de utiidad para analizar e usar en cada accion que te pida
##En este caso los videos son Download(5) && Download(2).

### 🎬 Qué tomaría de los videos como referencia

**Video 1**

- Presentación oscura/premium.
- Imagen principal ocupando gran parte del viewport.
- Sensación cinematográfica.
- Capas superpuestas.
- Transiciones suaves entre estados.
- Elementos centrales que aparecen/desaparecen con movimiento.
- Navegación minimalista.
- Mucho protagonismo de la fotografía.
- Sensación de sitio de alta gama.

**Video 2**

- Diseño editorial/cinematográfico para gastronomía.
- Fotografías enormes de producto.
- Tipografía grande.
- Secciones que cambian como escenas.
- Transiciones entre productos.
- Cards y elementos que se desplazan.
- Contraste negro + imágenes luminosas.
- Animaciones ligadas al scroll.
- Composición tipo **landing page + storytelling visual**.

La idea de los siguientes prompts es **no limitarse a copiar colores o componentes**, sino indicarle a la IA que estudie el video como una referencia de _timing, composición, desplazamiento, escala, profundidad, entrada/salida de elementos y ritmo visual_. Si es técnicamente posible, también le pedimos analizar frames del video y utilizar imágenes de referencia.

---

# 1. 🏎️ Aplicación Web/Móvil de Automóviles Premium

**Prompt:**

```text
Actúa como un equipo senior compuesto por:
- Product Designer
- UX/UI Designer
- Motion Designer
- React Engineer
- Frontend Architect
- Mobile Engineer
- Performance Engineer

Crea una aplicación web y móvil premium para una plataforma de vehículos deportivos, superdeportivos y automóviles de lujo.

STACK OBLIGATORIO:
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- React Router
- Para móvil: React Native + NativeWind
- Arquitectura modular y escalable
- Componentes reutilizables
- Diseño responsive mobile-first

REFERENCIA VISUAL OBLIGATORIA:
Utiliza los videos que te proporcioné como referencia principal de dirección artística y movimiento.

NO quiero simplemente una interfaz que se parezca superficialmente.

Analiza el video frame por frame y reproduce, cuando sea técnicamente posible:
- ritmo de las transiciones
- aparición y desaparición de elementos
- desplazamiento de imágenes
- escalado de fotografías
- profundidad
- parallax
- máscaras
- cambios de escena
- movimiento de tipografía
- comportamiento durante scroll
- interacción del cursor
- jerarquía visual
- composición cinematográfica
- sensación de profundidad

Si alguna animación requiere una imagen específica, genera/utiliza un recurso visual equivalente.

ESTÉTICA:
Crear una experiencia oscura, elegante, cinematográfica y extremadamente premium.

Utilizar:
- negro profundo
- gris carbón
- blanco
- pequeños acentos metálicos
- fotografías enormes de automóviles
- overlays
- blur
- gradients
- glassmorphism muy sutil
- sombras cinematográficas

PANTALLA PRINCIPAL:

Hero fullscreen:

[imagen automóvil]
        +
[título enorme]
        +
[modelo]
        +
[precio]
        +
[CTA]

La imagen debe moverse lentamente mientras el usuario hace scroll.

Implementar:
- Ken Burns effect
- parallax multicapa
- zoom progresivo
- desplazamiento horizontal
- texto entrando desde diferentes profundidades
- máscaras de imagen
- reveal cinematográfico

Cuando el usuario cambia de vehículo, NO hacer simplemente un cambio instantáneo.

Crear una transición cinematográfica:
1. imagen actual escala
2. contenido se desvanece parcialmente
3. nueva imagen aparece detrás
4. nueva imagen se desplaza
5. título cambia
6. datos aparecen
7. navegación recupera su posición

SECCIONES:

1. Hero
2. Modelos destacados
3. Explorador de vehículos
4. Comparador
5. Especificaciones
6. Galería
7. Experiencia 360°
8. Configurador
9. Reserva/test drive
10. Perfil

CONFIGURADOR:

Permitir modificar:
- color
- ruedas
- interior
- accesorios

Cada cambio debe tener animación.

Evitar interfaces tradicionales.

El automóvil debe sentirse como un objeto físico dentro de la pantalla.

MICROINTERACCIONES:

Agregar:
- hover magnético
- botones con desplazamiento
- cursor personalizado en desktop
- ripple
- tilt 3D
- imágenes que reaccionan al cursor
- indicadores animados
- scroll progress
- números animados
- transiciones entre páginas

PERFORMANCE:

Las animaciones deben utilizar:
- transform
- opacity
- will-change solamente cuando sea necesario
- GPU acceleration
- lazy loading
- responsive images

No sacrificar rendimiento por efectos.

RESULTADO:

La aplicación debe parecer una combinación de:
sitio automotriz de lujo
+
experiencia cinematográfica
+
aplicación moderna
+
portfolio interactivo.

La prioridad es:

1. experiencia visual
2. movimiento
3. fotografía
4. navegación
5. usabilidad
6. performance
```

---

# 2. 🍔 Plataforma de Restaurante / Food Experience

```text
Actúa como un equipo experto en:
UX/UI
Motion Design
React
Tailwind CSS
Mobile UX
Creative Development

Construye una aplicación web y móvil para un restaurante premium especializado en hamburguesas.

STACK:
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- React Native + NativeWind para móvil
- arquitectura componentizada

REFERENCIA PRINCIPAL:

Utiliza el segundo video proporcionado como referencia visual y de movimiento.

Analiza visualmente sus escenas y reproduce su lenguaje audiovisual:

- fotografías enormes
- fondo oscuro
- tipografía editorial
- transiciones entre productos
- zoom
- desplazamiento
- composición asimétrica
- aparición progresiva de contenido
- cambio de escenas
- navegación minimalista
- sensación cinematográfica

No construyas un simple ecommerce de comida.

Quiero una experiencia digital.

HOME:

La primera pantalla debe comenzar con una hamburguesa enorme.

La hamburguesa ocupa aproximadamente 60-80% del área visual.

Sobre ella:

01 / THE ORIGINAL

THE
BURGER

Descripción pequeña.

CTA.

Al hacer scroll:

La hamburguesa se desplaza.

El fondo cambia.

La tipografía se mueve.

Aparece la siguiente hamburguesa.

Crear sensación de que el usuario está atravesando diferentes escenas.

SECCIONES:

01 — HERO
02 — SIGNATURE BURGERS
03 — MENU
04 — BUILD YOUR BURGER
05 — INGREDIENTS
06 — STORY
07 — RESTAURANTS
08 — DELIVERY
09 — RESERVATION

BUILD YOUR BURGER:

Crear configurador visual.

Usuario selecciona:

pan
carne
queso
salsa
vegetales
extras

Cada ingrediente debe entrar/salir mediante animaciones.

La hamburguesa debe construirse visualmente por capas.

ANIMACIONES:

Implementar:
- image reveal
- clip-path
- parallax
- horizontal scrolling
- scale transitions
- text masking
- stagger animations
- floating ingredients
- magnetic buttons
- cursor interactions
- scroll-linked animations
- smooth section transitions

Cuando una hamburguesa cambie:

NO utilizar simplemente fade.

Crear una transición:
producto actual → desplazamiento → escala → salida → nueva fotografía → entrada → texto → información.

MÓVIL:

La experiencia móvil debe conservar el lenguaje cinematográfico.

No simplemente reducir el desktop.

Diseñar una composición específica para 390px.

RESULTADO:

Debe sentirse como una campaña publicitaria interactiva convertida en aplicación.

Si necesitas imágenes para conseguir el efecto visual del video, identifica qué imágenes son necesarias y utiliza placeholders estructurados con la posibilidad de sustituirlas posteriormente.
```

---

# 3. 🏨 Hotel / Resort Cinematográfico

```text
Crea una aplicación web y móvil para un hotel/resort de lujo.

Utiliza React + TypeScript + Tailwind CSS + Framer Motion.

Para móvil utiliza React Native + NativeWind.

REFERENCIA:

Analiza los videos proporcionados como si fueras un Motion Designer.

Utiliza sus movimientos como inspiración directa para:

- transiciones
- parallax
- zoom
- desplazamiento
- aparición de textos
- cambio de fotografías
- navegación
- ritmo
- profundidad

Si técnicamente es posible, analiza frames del video para aproximar el timing de las animaciones.

ESTILO:

Luxury cinematic.

Pantalla oscura.

Fotografía arquitectónica enorme.

Tipografía elegante.

Mucho espacio negativo.

Animaciones lentas y precisas.

HOME:

Imagen fullscreen de un resort.

Texto:

ESCAPE
THE
ORDINARY

CTA:

EXPLORE RESORT

Al hacer scroll:

La fotografía se transforma.

El texto desaparece.

Aparece otra escena.

La navegación permanece flotando.

SECCIONES:

- habitaciones
- suites
- spa
- restaurantes
- piscina
- experiencias
- actividades
- ubicación
- reservas

ROOM EXPLORER:

Crear habitaciones como escenas.

Cada habitación debe ocupar gran parte del viewport.

Cuando el usuario cambia:

fotografía actual
→ zoom
→ desplazamiento
→ máscara
→ nueva fotografía
→ título
→ precio

GALERÍA:

Crear galería horizontal cinematográfica.

Utilizar:
- drag
- wheel
- touch
- momentum
- parallax

RESERVAS:

Crear un flujo de reserva visualmente premium.

No usar un formulario tradicional aburrido.

Dividirlo en pasos animados:

FECHA
↓
HABITACIÓN
↓
HUÉSPEDES
↓
EXTRAS
↓
CONFIRMACIÓN

Cada paso entra mediante una transición cinematográfica.

Agregar soporte para dark mode.

Prioridad:

visual storytelling > decoración excesiva.

La interfaz debe parecer una experiencia de marca de hotel de lujo.
```

---

# 4. 🎧 Plataforma de Música / Streaming

```text
Crea una aplicación de streaming musical moderna utilizando:

React
TypeScript
Tailwind CSS
Framer Motion
React Native
NativeWind

La aplicación debe funcionar como web app y experiencia móvil.

REFERENCIA VISUAL:

Usa los videos proporcionados como inspiración directa para el sistema de movimiento.

Analiza:
- ritmo
- escala
- transiciones
- imágenes
- desplazamientos
- composición
- overlays
- profundidad

Quiero que la aplicación tenga un lenguaje cinematográfico similar.

HOME:

Mostrar artista/álbum actualmente destacado.

Una fotografía enorme ocupa la pantalla.

Información encima.

Al cambiar de canción:

La portada no debe cambiar instantáneamente.

Crear:
- scale
- blur
- slide
- crossfade
- parallax
- text transition

PLAYER:

Crear reproductor visual.

La portada puede reaccionar al audio mediante animaciones.

Implementar:

- waveform
- partículas
- glow
- blur
- rotating artwork
- progress animation

SECCIONES:

Home
Discover
Artists
Albums
Playlists
Library
Recently Played

ARTIST PAGE:

Hero visual.

Imagen gigante.

Nombre.

Género.

Biografía.

Canciones.

Álbumes.

Crear transición entre artistas.

MÓVIL:

Bottom navigation.

Mini-player flotante.

Gesture controls.

Swipe entre canciones.

Gestos deben sentirse naturales.

Agregar:
- drag
- swipe
- spring physics
- magnetic buttons
- hover
- cursor interaction

Evitar animaciones gratuitas.

Cada movimiento debe tener una función.
```

---

# 5. 🛍️ Ecommerce Fashion de Alta Gama

```text
Crea una plataforma ecommerce de moda premium utilizando React, TypeScript y Tailwind CSS.

Usar:
- Framer Motion
- React Router
- Zustand
- React Native
- NativeWind

REFERENCIA:

Usa los videos adjuntos como referencia de movimiento y composición.

Quiero reproducir la sensación de:

editorial de moda
+
cinema
+
ecommerce
+
portfolio interactivo.

HOME:

Hero con fotografía de modelo/producto.

La imagen debe ocupar casi todo el viewport.

El texto debe superponerse.

Implementar:
- parallax
- image reveal
- zoom
- mask transitions
- scroll animations
- horizontal galleries
- typography animations

PRODUCT PAGE:

No crear una página ecommerce convencional.

Crear:

PRODUCT
IMAGE

↓
DETAILS

↓
SIZES

↓
COLOR

↓
ADD TO BAG

La imagen del producto debe interactuar con el usuario.

Cuando cambia el color:

hacer transición visual entre fotografías.

Cuando selecciona talla:

feedback animado.

Cuando agrega al carrito:

El producto debe viajar visualmente hacia el carrito.

Implementar una animación tipo:

producto → escala → desplazamiento → carrito.

CATÁLOGO:

Crear navegación editorial.

Categorías:

NEW
MEN
WOMEN
COLLECTIONS
SALE

Crear grid dinámico.

Al pasar el cursor sobre una imagen:
- zoom
- desplazamiento
- cambio de imagen
- metadata

CHECKOUT:

Minimalista.

Animaciones suaves.

Mobile-first.

El resultado debe parecer una campaña de moda interactiva, no un template de ecommerce.
```

---

# 6. 🏠 Real Estate / Arquitectura

```text
Diseña una aplicación web y móvil premium para inmobiliaria y arquitectura.

STACK:

React
TypeScript
Tailwind CSS
Framer Motion
React Native
NativeWind

REFERENCIA:

Utiliza los videos proporcionados para estudiar:

- fotografía
- arquitectura visual
- movimiento
- transiciones
- ritmo
- zoom
- parallax
- composición

Crear una experiencia cinematográfica.

HOME:

Fotografía fullscreen de una propiedad.

Overlay:

01
CASA
CONTEMPORÁNEA

MONTEVIDEO

$XXX

Al hacer scroll:

La imagen hace zoom lentamente.

El contenido cambia.

Nueva propiedad aparece.

Crear efecto de navegación entre propiedades como si fueran escenas cinematográficas.

PROPERTY EXPLORER:

Cada propiedad debe tener:

Hero
Galería
Planos
Características
Ubicación
Tour
Precio
Contacto

GALERÍA:

Crear navegación horizontal.

Las fotografías pueden ocupar diferentes proporciones.

Implementar profundidad.

MAP:

Mostrar mapa interactivo.

Las propiedades aparecen mediante animaciones.

PROPERTY COMPARISON:

Seleccionar hasta tres propiedades.

Comparación visual.

Utilizar números animados.

3D:

Si es viable, permitir visualizar modelos 3D mediante Three.js.

Crear una sección:

360° / 3D EXPERIENCE

CONTACTO:

Formulario progresivo animado.

No utilizar una pantalla llena de campos.

El usuario avanza paso a paso.

Resultado:

Una inmobiliaria con apariencia de estudio de arquitectura internacional.
```

---

# 7. 🤖 Dashboard de IA / AI Workspace

```text
Construye una aplicación web y móvil llamada AI Workspace.

Stack obligatorio:

React
TypeScript
Tailwind CSS
Framer Motion
React Native
NativeWind

La aplicación debe ser una plataforma para utilizar múltiples modelos de inteligencia artificial.

REFERENCIA VISUAL:

Aunque el producto es técnico, utiliza los videos proporcionados como inspiración para el sistema de movimiento.

Quiero combinar:

cinematic UI
+
developer tool
+
AI interface.

HOME:

Dashboard oscuro.

Panel principal:

ASK AI

El usuario escribe una petición.

Mientras la IA procesa:

crear animación visual.

Por ejemplo:

input
→ procesamiento
→ nodos
→ resultado

Crear un sistema de estados:

IDLE
THINKING
PROCESSING
GENERATING
COMPLETE
ERROR

Cada estado tiene animación propia.

WORKSPACE:

Sidebar.

Canvas.

Inspector.

Prompt panel.

Output panel.

Crear paneles que entren mediante:
- slide
- scale
- blur
- spring

CANVAS:

Crear nodos visuales.

Los nodos pueden conectarse.

Cuando se ejecuta un workflow:

animar el flujo de información.

Cada nodo cambia:

idle → active → processing → complete.

MODEL SELECTOR:

Modelos representados mediante cards.

Hover:

tilt
scale
glow

Seleccionar:

expansión animada.

MOBILE:

Convertir el workspace en interfaz táctil.

Bottom sheets.

Gestures.

Swipe.

Drag.

Long press.

Prioridad:

experiencia premium
+
fluidez
+
claridad técnica.
```

---

# 8. 🎮 Plataforma Gaming / Game Launcher

```text
Crea una aplicación web y móvil para una plataforma gaming.

Utiliza:

React
TypeScript
Tailwind CSS
Framer Motion
React Native
NativeWind

REFERENCIA:

Utiliza los videos proporcionados como referencia de movimiento.

Quiero una interfaz que tenga sensación de:

game cinematic
+
streaming platform
+
interactive experience.

HOME:

Juego destacado fullscreen.

Imagen/video de fondo.

Título gigante.

Descripción.

PLAY NOW.

Al cambiar de juego:

no cambiar instantáneamente.

Crear transición cinematográfica:

background
→ blur
→ scale
→ slide
→ nueva imagen
→ title reveal
→ buttons.

GAME CARDS:

Cards grandes.

Hover:

- scale
- tilt
- image zoom
- overlay
- metadata reveal

GAME PAGE:

Hero.

Screenshots.

Trailer.

Descripción.

Características.

Requisitos.

Reviews.

Download.

PROFILE:

Avatar.

Nivel.

XP.

Achievements.

Juegos.

Actividad.

Crear barras de progreso animadas.

ANIMACIONES:

- particles
- gradients
- glow
- parallax
- reveal
- page transitions
- scroll animations
- cursor effects
- magnetic buttons

No sobrecargar.

Las animaciones deben parecer parte de un producto profesional.
```

---

# 9. ✈️ Travel / Explorador de Destinos

```text
Crea una aplicación web y móvil para explorar destinos turísticos.

STACK:

React
TypeScript
Tailwind CSS
Framer Motion
React Native
NativeWind

REFERENCIA:

Analiza los videos proporcionados y adopta su lenguaje cinematográfico.

El usuario debe sentir que está viajando dentro de la aplicación.

HOME:

Mostrar destino destacado.

Fotografía fullscreen.

Ejemplo:

PATAGONIA

THE END
OF THE WORLD

EXPLORE

Cuando el usuario hace scroll:

la fotografía cambia.

La tipografía se desplaza.

Aparecen datos.

La siguiente escena entra.

Crear efecto de storytelling.

DESTINATION EXPERIENCE:

Cada destino contiene:

Hero
Places
Hotels
Restaurants
Activities
Gallery
Map
Itinerary

PHOTO STORY:

Crear una sección donde las fotografías aparecen progresivamente.

Usar:

clip-path
scale
opacity
translate
parallax

ITINERARY BUILDER:

Usuario selecciona:

día
destino
actividad
hotel
restaurante

La aplicación crea un itinerario visual.

Los elementos se reorganizan mediante animaciones.

MAP:

Mapa interactivo.

Los puntos aparecen progresivamente.

MOBILE:

Swipe entre destinos.

Gesture navigation.

Bottom sheet.

Fullscreen photography.

RESULTADO:

Debe sentirse como una mezcla entre:

revista de viajes
+
documental
+
aplicación premium.
```

---

# 10. 🧠 Plataforma Educativa / Learning OS

```text
Crea una aplicación web y móvil educativa llamada Learning OS.

Objetivo:

Convertir el aprendizaje en una experiencia visual, interactiva y motivadora.

STACK:

React
TypeScript
Tailwind CSS
Framer Motion
React Native
NativeWind

REFERENCIA:

Utiliza los dos videos proporcionados como referencia para la dirección de arte y especialmente para las animaciones.

Analiza:

- ritmo
- transiciones
- escalado
- fotografía
- movimiento
- navegación
- composición
- profundidad

No quiero un dashboard educativo tradicional.

Quiero una experiencia cinematográfica.

HOME:

Mostrar:

CONTINUE LEARNING

con una materia destacada.

Ejemplo:

JAVASCRIPT

68%

Una imagen/fondo relacionado con programación ocupa gran parte de la pantalla.

Al entrar:

transición cinematográfica.

LEARNING PATH:

Crear un camino visual.

Los cursos aparecen como nodos.

Ejemplo:

HTML
 ↓
CSS
 ↓
JavaScript
 ↓
React
 ↓
TypeScript
 ↓
Backend

Cada nodo tiene:

- progreso
- dificultad
- tiempo
- proyectos

Cuando se completa un módulo:

animación visual de progreso.

LESSON:

Dividir contenido en escenas.

No mostrar todo en una página.

Crear:

INTRO
↓
CONCEPT
↓
EXAMPLE
↓
PRACTICE
↓
CHALLENGE
↓
RESULT

Cada transición debe sentirse como pasar de una escena a otra.

CODE PLAYGROUND:

Editor de código.

Resultado en vivo.

Cuando el usuario ejecuta:

mostrar flujo:

CODE
↓
COMPILE
↓
RUN
↓
RESULT

GAMIFICATION:

XP.

Nivel.

Racha.

Achievements.

Progress.

Animar cada cambio.

MOBILE:

Diseñar específicamente para móvil.

Gestos.

Swipe.

Bottom navigation.

Cards interactivas.

Microinteracciones.

VISUAL LANGUAGE:

Dark premium.

Tipografía grande.

Gradientes sutiles.

Glass panels.

Blur.

Parallax.

Motion.

Pero mantener legibilidad y accesibilidad.

OBJETIVO FINAL:

La aplicación debe parecer una mezcla de:

Apple-style product experience
+
cinematic website
+
modern learning platform
+
interactive operating system.

No construir un simple LMS.

Construir una experiencia.
```

---

# 🔥 Prompt maestro para cualquiera de las 10

Además, te recomiendo agregar **este bloque al final de cualquiera de los prompts**. Es especialmente importante porque obliga al agente de desarrollo a **analizar el video antes de comenzar a programar**, en lugar de simplemente generar una UI genérica.

```text
PROTOCOLO DE REPLICACIÓN VISUAL Y MOTION DESIGN

Antes de escribir código:

1. Analiza el video proporcionado.

2. Identifica sus escenas principales.

3. Extrae conceptualmente:
   - composición
   - jerarquía
   - timing
   - easing
   - velocidad
   - dirección de movimiento
   - escalado
   - profundidad
   - parallax
   - blur
   - opacity
   - máscaras
   - desplazamiento
   - comportamiento del texto
   - interacción entre elementos

4. Divide el video en una secuencia:

SCENE 01
SCENE 02
SCENE 03
SCENE 04
...

5. Para cada escena crea una especificación:

ELEMENTO
POSICIÓN
ESTADO INICIAL
MOVIMIENTO
DURACIÓN
EASING
ESTADO FINAL
TRIGGER

6. Después transforma esa especificación en componentes React.

7. Implementa las animaciones utilizando Framer Motion y CSS/Tailwind.

8. Cuando sea necesario utiliza:
   - CSS clip-path
   - masks
   - transforms
   - perspective
   - 3D transforms
   - blur
   - gradients
   - SVG
   - canvas
   - WebGL/Three.js cuando realmente aporte valor.

9. Si una imagen del video es fundamental para conseguir el efecto visual:

   - identifica el tipo de imagen necesaria
   - utiliza una imagen equivalente
   - crea un placeholder con exactamente las mismas proporciones
   - permite reemplazar posteriormente el asset.

10. Si tienes acceso directo al video, inspecciona frames representativos.

11. No inventes una animación diferente si el video muestra claramente otra.

12. Intenta reproducir la coreografía visual del video con la mayor fidelidad técnica posible.

13. Sin embargo, adapta el contenido al producto solicitado.

14. No copies branding, logotipos, textos o elementos propietarios innecesarios.

15. El objetivo es reproducir el LENGUAJE VISUAL Y EL COMPORTAMIENTO DEL MOTION DESIGN.

16. Implementa primero una versión funcional.

17. Después realiza una segunda pasada exclusivamente dedicada a Motion Design.

18. Después realiza una tercera pasada para Performance.

19. Finalmente realiza una auditoría visual:

   - ¿La primera impresión coincide con la referencia?
   - ¿Las transiciones tienen el mismo ritmo?
   - ¿Las imágenes tienen la misma sensación de escala?
   - ¿El texto aparece correctamente?
   - ¿El scroll produce el efecto esperado?
   - ¿La experiencia móvil conserva la esencia?
   - ¿Hay animaciones innecesarias?
   - ¿El rendimiento sigue siendo alto?

No finalices hasta corregir las discrepancias visuales importantes.
```

## 🚀 Y llevaría el concepto todavía más lejos

Para tu caso, **no me quedaría simplemente con “React + Tailwind + Framer Motion”**.

La arquitectura visual que se desprende de los videos puede convertirse en un **motor reutilizable de Motion Design**:

```text
                    VIDEO DE REFERENCIA
                            │
                            ▼
                  ┌───────────────────┐
                  │ Video Analyzer     │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Scene Detection    │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Motion Extraction  │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ Motion Spec JSON   │
                  └─────────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          React          Mobile        Animation
          UI             UI            Engine
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    EXPERIENCIA FINAL
```

Esto permitiría que en vez de decirle a una IA **“haz una web bonita como este video”**, puedas darle:

> **“Analiza este video → extrae sus escenas → identifica sus movimientos → convierte esos movimientos en componentes React → adapta los componentes al producto → verifica visualmente el resultado.”**

Y eso encaja **muchísimo mejor** con el tipo de sistema automatizado de desarrollo que vienes planteando.

Si el objetivo es utilizar esto posteriormente en **Lovable, Antigravity, Cursor, Claude Code u otro agente de programación**, estos prompts también se pueden convertir en un **“Prompt Master” único que reciba cualquier video + descripción de aplicación y genere automáticamente la arquitectura, assets, componentes, animaciones y código React/Tailwind**.
