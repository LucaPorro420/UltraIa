# UltraIa — Descripción Total del Proyecto

> Documento oficial de cara al usuario (administrador y usuario final).
> Describe **qué puedes usar, ver y conocer** de UltraIa: sus agentes, sus funciones y
> sus funcionalidades. No cubre detalles internos de construcción: solo la experiencia.

---

## 1. ¿Qué es UltraIa?

UltraIa es una **plataforma de inteligencia artificial integral** que hace dos cosas a la vez:

1. **Te da un equipo de agentes IA a medida** — asistentes especializados con los que
   conversas, les encargas trabajo y los mejoras con el tiempo.
2. **Opera como una fábrica de contenido autónoma** — descubre temas, crea el contenido
   (textos, guiones, imágenes, audio), lo empaqueta para cada red, espera tu aprobación
   cuando toca, publica, mide resultados y aprende de ellos.

La idea central: **tú diriges, el sistema trabaja**. UltraIa no es un chatbot suelto ni una
colección de herramientas dispersas; es un sistema completo que se mantiene vivo por sí mismo,
detecta sus propios fallos, aprende de cada ciclo y te presenta resultados para que tú decidas.

Todo el producto está pensado en **español y árabe** (bilingüe de fábrica) y funciona
**sin necesidad de configurar nada**: las capacidades básicas están activas desde el primer
momento, y las opcionales se encienden solas cuando decides conectarlas.

---

## 2. Formas de acceso

| Vía | Cómo | Para quién |
|---|---|---|
| **Web** | `http://localhost:3000` en tu navegador (Chrome/Brave/Edge) | Uso principal |
| **Escritorio** | Ventana propia de UltraIa (lanzador de 1 clic incluido en el paquete) | Quien prefiere app nativa |
| **Móvil** | App Android/iOS que se conecta a tu UltraIa (escanéando un código) | Aprobar y consultar desde cualquier lugar |

**Cuentas:**
- La instalación trae una cuenta de administrador lista: usuario **`admin`**, contraseña **`admin`**
  (cámbiala en cuanto entres). El administrador ve todo: métricas, aprobaciones, gestión completa.
- Cualquier persona puede registrarse como usuario final y trabajar con sus propios agentes,
  publicaciones y archivos.

---

## 3. Mapa de la aplicación

Al entrar ves un entorno de trabajo oscuro estilo estudio profesional, con estas secciones:

| Sección | Qué haces ahí |
|---|---|
| **Dashboard** | Tu centro de mando: estado del sistema, actividad reciente y el pipeline visible Plan → Build → Test → Review → Ship → Simplify |
| **Agentes** | Creas agentes nuevos o conversas con los existentes. Hay más de una docena de agentes listos (investigador, analista, guionista, publicador, orquestador…) y puedes crear los tuyos eligiendo sus habilidades |
| **Studio** | Espacio multimodal: combinas varios agentes (web, imagen, video, música, texto) en un mismo lugar de trabajo |
| **Gallery** | Explora y genera imágenes. Incluye una biblioteca de más de 1.300 prompts de inspiración que puedes usar, mejorar o compartir |
| **Builder** | Construyes páginas web arrastrando bloques: la ves en vivo y la exportas lista para usar |
| **Cloud** | Tu nube personal de archivos: sube, organiza en carpetas, consulta y borra. También incluye guías para tener tu propia nube gratuita |
| **Métricas** | Rendimiento por canal: qué se publicó, qué falló, tasas de éxito y datos reales de tus plataformas conectadas |
| **Lab** | Catálogo vivo de capacidades experimentales del sistema: qué existe, qué hace y cómo probarlo |
| **Roadmap** | El mapa del proyecto: qué está hecho, qué viene y hacia dónde va UltraIa |
| **Publicaciones** | La cola editorial: paquetes esperando tu aprobación, programados, publicados o fallidos |
| **Blog / Explore / Recursos** | Secciones públicas: contenido publicado, galería comunitaria y recursos de IA en español |

---

## 4. Los agentes

Un agente de UltraIa es mucho más que un chat:

- **Especialidad** — cada agente tiene un rol (investigar, analizar, escribir guiones,
  publicar, orquestar todo el proceso…).
- **Habilidades** — le activas o desactivas capacidades concretas: buscar en la web,
  generar imágenes, narrar audio, editar video, publicar en redes, consultar su memoria…
- **Memoria propia** — recuerda versiones anteriores de sí mismo, lo que observó y lo que
  se le dijo; puede retroceder a una versión previa si algo sale mal.
- **Mejora continua** — con la evidencia de resultados (tu feedback y las métricas), el
  sistema propone cómo mejorar cada agente, siempre con tu aprobación.
- **Trabajo en equipo** — el agente orquestador coordina al resto: planifica, delega,
  revisa y entrega.

Los agentes del sistema siguen el pipeline **Plan → Build → Test → Review → Ship → Simplify**:
planifican antes de actuar, construyen, verifican, se auto-revisan, entregan y simplifican.

---

## 5. Qué puedes crear

Desde Studio o pidiéndoselo a un agente, UltraIa puede producir:

- **Imágenes** — desde una descripción, con estilos variados y referencias visuales.
- **Videos** — guiones con escenas, movimientos de cámara profesionales, narración y
  subtítulos; cortos verticales de 45–60 s o piezas largas de hasta 3 minutos con actos y
  secuencias estructuradas.
- **Narración y voz** — locución automática en 14 idiomas (español y árabe incluidos).
- **Música y efectos** — búsqueda de música para tus piezas y creación de efectos de sonido.
- **Efectos visuales** — fuego, rayos, meteoros, plasma y más, generados 100 % por código.
- **Objetos y geometría 3D** — formas matemáticas (supershape, Möbius) exportables en
  formatos 3D estándar para usar en otros programas.
- **Imágenes y videos procedurales** — fractales, campos de ruido, ondas y animaciones
  abstractas generadas desde pura matemática.
- **Diagramas** — líneas de tiempo, flujos y arquitecturas con estilo editorial limpio,
  listos para documentos o presentaciones.
- **Páginas web** — con el Builder: arrastras bloques, ajustas propiedades y exportas.
- **Grabaciones de pantalla** — capturas automatizadas de tu pantalla con acciones
  programadas, zooms automáticos donde haces clic, edición y salida lista para publicar.
- **Edición de video** — recortes limpios por transcripción, transiciones, corrección de
  color y subtítulos, siguiendo reglas profesionales de producción.
- **Contenido de viajes** — planifica videos de destinos con escenas, cámara, narración y
  música sugerida; replica paisajes en variaciones de hora y clima.

Detrás de todo esto hay un **director virtual**: convierte tu idea en un plan, genera cada
pieza, la critica (¿está sincronizado el audio? ¿el personaje mantiene su identidad? ¿la
causa produce su efecto?) y corrige hasta alcanzar la calidad que pediste.

---

## 6. La fábrica de publicación

El flujo completo, de la idea a la métrica:

1. **Ideas** — el sistema vigila fuentes de actualidad y propone temas priorizados para
   cada canal, evitando repetir lo ya publicado.
2. **Contenido** — según el formato ideal del canal, redacta un artículo o escribe un
   guion (con narración de voz si quieres), siempre en español y/o árabe citando fuentes.
3. **Paquete** — arma el paquete completo por canal: título, descripción, hashtags,
   subtítulos, imagen o video en el formato correcto y horario sugerido de publicación.
4. **Tu aprobación** — regla inviolable: el contenido de **texto** puede publicarse solo;
   todo **video e imagen pasa por ti** (queda en borrador hasta que apruebas o rechazas).
5. **Publicación** — en el momento programado, el sistema publica en los canales:
   YouTube, TikTok, Instagram Reels, Threads, X, LinkedIn, Telegram, Discord, Slack y el
   blog propio. Si un canal falla, lo registra con claridad y sigue con los demás.
6. **Medición** — métricas por canal (publicadas, fallidas, pendientes, tasa de éxito)
   y datos reales de las plataformas cuando están conectadas.
7. **Mejora** — con esos resultados propone experimentos concretos ("prueba ganchos más
   cortos") y compone las victorias en un manual de crecimiento de tu canal.

---

## 7. El sistema vive solo

UltraIa incorpora un **cerebro autónomo** que mantiene el proyecto sano sin que tú hagas nada:

- **Latido periódico** — cada 2 horas en tu equipo y cada 4 horas en la nube (aunque tu
  PC esté apagado), evalúa su salud con una puntuación de 0 a 100 (verde / ámbar / rojo).
- **Detecta sus propias regresiones** — si pierde pruebas, memoria o actividad, lo nota y
  lo reporta antes de que sea un problema.
- **Autoaprendizaje** — detecta huecos de conocimiento, prioriza mejoras por impacto vs.
  esfuerzo y redacta planes de mejora listos para ejecutar.
- **Memoria verificada** — distingue entre "verdad comprobada" y "respuesta cruda": guarda
  los hechos verificados aparte, los consulta semánticamente y nunca confunde una suposición
  con un dato confirmado.
- **Conocimiento conectado** — construye mapas de conocimiento de su propio código y
  documentación, descubriendo relaciones y puntos calientes.
- **Ingeniería autónoma supervisada** — un motor interno propone el siguiente paso de
  ingeniería, respeta puertas de calidad y nunca cruza límites sin aprobación humana.

---

## 8. Modos de trabajo

Para dirigir el desarrollo del propio UltraIa (o cualquier encargo grande), el administrador
usa cuatro modos, integrados en el flujo natural:

| Modo | Nombre | Qué hace |
|---|---|---|
| **S-D** | Especificar-Diseñar | Define la especificación y el diseño ANTES de escribir nada |
| **L-T** | Aprender-Probar | Consulta lecciones pasadas, verdades verificadas y define cómo se probará |
| **P-P** | Planificar | Sensa el estado real, investiga y escribe un plan con predicción de resultado |
| **P-B** | Construir | Ejecuta el plan, verifica TODO el proyecto y deja evidencia |

Cada ciclo queda registrado en una bitácora auditable: qué se planeó, qué se hizo, qué se
verificó y qué se aprendió.

---

## 9. Reglas del producto

Estas reglas son parte de la identidad de UltraIa:

- **Funciona sin configurar nada** — las capacidades base usan servicios gratuitos y abiertos.
  Las opciones premium se activan solas cuando tú decides conectarlas, y si algo no está
  disponible, el sistema **degrada con elegancia**: te dice qué falta y ofrece la alternativa.
- **Aprobación humana híbrida** — textos: automáticos. Videos e imágenes: siempre pasan por ti.
- **Bilingüe real** — español y árabe de primera clase en contenido, narración y subtítulos.
- **Tus secretos son tuyos** — las claves que configuras quedan cifradas, nunca se muestran
  completas en pantalla y jamás se exponen en la interfaz.
- **Tus archivos son tuyos** — la nube personal guarda todo bajo tu control, con manifiesto
  de inventario y guía para llevarla a tu propia nube gratuita.
- **Todo deja rastro** — bitácora de ciclos, planes escritos antes de actuar y evidencia de
  verificación en cada cambio.

---

## 10. Límites conocidos (honestidad ante todo)

- El **render final de video** (unir todo en el archivo definitivo) necesita una herramienta
  de video instalada en tu equipo; el sistema te guía para instalarla en un paso.
- Algunas plataformas exigen **aprobación de desarrollador** propia para publicar
  (por ejemplo TikTok); hasta entonces ese canal queda listo pero inactivo.
- Publicar la app en iPhone requiere cuenta de desarrollador de Apple (decisión tuya);
  Android y prueba en vivo no necesitan nada.
- Sin claves opcionales configuradas, las funciones premium simplemente no aparecen:
  nada se rompe, nada se inventa.
- El sistema **nunca inventa datos**: si no conoce un hecho, declara que falta información.

---

## 11. Visión V0.1 — lo que viene

Esta es la hoja de mejora aprobada para convertir la web en un **IDE completo de UltraIa**:

- **Entorno IDE total** — toda la aplicación vivirá en un espacio de ventanas flexibles:
  paneles redimensionables a tu gusto, tamaños memorizados entre sesiones y atajos de teclado.
- **Varios agentes y modos a la vez** — abre dos o tres conversaciones lado a lado con
  agentes distintos, compara respuestas, asigna un modo diferente a cada panel y trabaja
  como en un estudio profesional.
- **Conexiones desde la interfaz** — gestiona tus cuentas de canales (pegar clave, probar
  conexión, ver estado) con un indicador de salud siempre visible; y mejora del acceso
  multi-dispositivo: entrada fluida desde web, móvil y escritorio.
- **Diseño gráfico refinado** — pulido visual completo del tema oscuro actual: densidad,
  jerarquía, estados de carga y micro-interacciones.
- **Responsividad total** — experiencia impecable en móvil, tablet y escritorio, en la web
  y en la app móvil.

> Estado de esta visión: **aprobada**. Ejecución por fases en los próximos ciclos.

---

*Documento generado el 24/08/2026 · UltraIa v0.1 · Complementa a `PrototypeREADME.md`
(estado técnico operativo) y `README.md` (índice general del repositorio).*
