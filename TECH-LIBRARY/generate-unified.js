#!/usr/bin/env node
// ============================================================
// 👦 HOLA SOY UN TEEN Y NO SE NADA DE CODIGO 😱
// Este archivo es como una FABRICA AUTOMATICA que genera
// una pagina web ENORME con libros y tecnologias de programacion.
// Lee archivos JSON y .md de carpetas, los procesa como
// una licuadora de codigo y escupe un HTML autocontenido
// con TODO el CSS y JS adentro. Es como un traba manual
// pero hecho con magia de programacion.
// ============================================================

/**
 * Generador unificado TECH-LIBRARY — libros + documentacion de tecnologias.
 * Esto es el COMMENT que ya venia, lo dejo porque es parte del codigo original
 */

// omg esto que hace??? parece magia oscura
// bueno el shebang #!/usr/bin/env node de arriba le dice al sistema
// \"ejecutame con node\" como un boton de \"play\" pero para terminal

// ===== IMPORTACIONES =====
// require = como pedir prestado algo, \"dame el modulo fs porfa\"

const fs = require('fs'); // fs = file system?? osea poder leer y escribir archivos desde codigo??? como el explorador de archivos pero en la terminal, INCREIBLE
const path = require('path'); // path = para armar rutas de archivos sin importar si es windows o linux, tipo GPS para archivos, \"esta en C:\\Users\\Desktop\\...\"\n

// ===== LOAD BOOKS =====
// aca cargamos los libros desde archivos JSON
// JSON es como un objeto de javascript pero en texto
// es como cuando guardas datos en un archivo plano pero estructurado, tipo una tabla de Excel pero cool

const LIBROS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'libros-data.json'), 'utf8'));
// __dirname = la carpeta donde esta este archivo, o sea TECH-LIBRARY/
// path.join une las partes de la ruta, como pegar piezas de LEGO
// '..' significa \"sube un nivel\" osea va a la carpeta padre
// readFileSync = lee el archivo COMPLETO de golpe, sin pausas
// JSON.parse = convierte el texto JSON a un objeto de JS, magia total
// LIBROS es una lista de libros, cada uno tiene titulo, autor, url, formato, seccion, etc

const SECCIONES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secciones-data.json'), 'utf8'));
// secciones = como capitulos o categorias de los libros, o sea agrupaciones
// cada seccion tiene id, titulo, descripcion y categoria

const CATEGORIAS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'categorias-data.json'), 'utf8'));
// categorias = las categorias PADRE de las secciones, como generos en Netflix pero de libros
// si seccion es \"React\" la categoria seria \"Frontend\", asi de simple

// ===== LOAD TECH DOCS =====
// aca cargamos la documentacion de tecnologias
// son archivos .md (markdown) que estan en la carpeta Completo
// .md es markdown osea texto con estrellitas y numeral, como un tweet pero con formato pro

const TECH_DIR = path.join(__dirname, 'Completo'); // la ruta completa de la carpeta Completo, como la direccion de una casa pero de archivos
const techFiles = fs.readdirSync(TECH_DIR).filter(f => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md');
// readdirSync lee un directorio?? como cuando abres una carpeta en el explorador pero con codigo
// devuelve una lista con TODOS los nombres de archivos de la carpeta
// .filter() es como pasar todo por un colador, solo quedan los que cumplen la condicion
// endsWith('.md') = que termine en .md, o sea que sea archivo markdown
// y que NO sea INDEX.md ni README.md porque esos son como el \"indice\" y \"descripcion\" de la carpeta, no nos interesan

const TECH_CATEGORIES = {
  // TECH_CATEGORIES es un objeto con las categorias de tecnologias
  // cada una tiene nombre, icono emoji y color en hexadecimal
  // es como un catalogo de categorias para organizar las docs de tech
  'frontend': { nombre: 'Frontend', icon: '🎨', color: '#8b5cf6' }, // frontend = lo que ve el usuario en la pantalla, lo bonito, los colores, los botones, TODO lo visual
  'backend': { nombre: 'Backend', icon: '⚙️', color: '#3b82f6' }, // backend = lo que pasa por detras, como el motor de un carro, el usuario no lo ve pero sin el nada funciona
  'database': { nombre: 'Base de Datos', icon: '🗄️', color: '#22c55e' }, // database = donde se guardan los datos, como un archivo Excel pero mas profesional y rapido
  'ai-ml': { nombre: 'IA/ML', icon: '🤖', color: '#ef4444' }, // AI/ML = inteligencia artificial y machine learning, los robots que piensan, Skynet pero bonito
  'mobile': { nombre: 'Movil', icon: '📱', color: '#f59e0b' }, // mobile = apps de celular, como Instagram pero hecha por ti desde cero
  'animation': { nombre: 'Animacion/3D', icon: '🎬', color: '#ec4899' }, // animacion y 3D = como los dibujos animados pero hecho con codigo, Pixar level
  'testing': { nombre: 'Testing', icon: '🧪', color: '#06b6d4' }, // testing = probar que el codigo no este roto, como QA pero automatizado con robots
  'infra': { nombre: 'Infraestructura', icon: '☁️', color: '#8b5cf6' }, // infra = la nube, servidores, donde corre todo, como la casa donde vive tu pagina web
  'realtime': { nombre: 'Tiempo Real', icon: '⚡', color: '#f59e0b' }, // realtime = como WhatsApp que llegan los mensajes al instante, sin esperar
  'security': { nombre: 'Seguridad', icon: '🔒', color: '#ef4444' }, // security = proteger los datos, como un candado digital, que nadie robe tu contraseña
  'devops': { nombre: 'DevOps', icon: '🚀', color: '#22c55e' }, // devops = combinar desarrollo y operaciones, como el equipo de logistica que entrega todo
  'tools': { nombre: 'Herramientas', icon: '🛠️', color: '#6366f1' } // tools = las herramientas que usan los programadores para hacer su vida mas facil
};

const TECH_MAP = {
  // TECH_MAP es como un diccionario pero para tech, o sea buscas por slug y te da info, como el Google pero local y sin anuncios
  // cada tecnologia tiene: slug (id bonito), cat (categoria), title (nombre bonito), version y tags (etiquetas)
  // slug = caracol en ingles? pero aqui es como un ID bonito para las tecnologias
  // es un identificador amigable, en vez de un numero aburrido pones \"nextjs-15\"

  'nextjs-15': { cat: 'frontend', title: 'Next.js 15', version: '15.3.3', tags: ['react','ssr','app-router','turbopack'] }, // Next.js es un framework para hacer paginas web, como WordPress pero para programadores que saben lo que hacen
  'react-19': { cat: 'frontend', title: 'React 19', version: '19.2.3', tags: ['hooks','server-components','compiler'] }, // React = libreria para hacer interfaces, la usan muchisimo en Silicon Valley y en tu tarea de la universidad
  'typescript-5': { cat: 'frontend', title: 'TypeScript 5.8', version: '5.8.2', tags: ['types','generics','pattern-matching'] }, // TypeScript = JavaScript pero con tipos, o sea le dices al codigo que tipo de dato es cada cosa, como poner etiquetas a todo
  'tailwind-v4': { cat: 'frontend', title: 'Tailwind CSS v4', version: '4.1.4', tags: ['css','design-system','@theme'] }, // Tailwind = para hacer CSS bonito sin escribir tanto CSS, como instrucciones de estilo pre-hechas
  'vercel-ai-sdk': { cat: 'backend', title: 'Vercel AI SDK', version: '4.1.61', tags: ['ai','streaming','tools','agents'] }, // Vercel AI SDK = para hacer apps con inteligencia artificial, como darle un cerebro a tu pagina
  'zod': { cat: 'backend', title: 'Zod', version: '3.24.2', tags: ['validation','schema','typescript'] }, // Zod = para validar datos, como un Guardia que revisa que TODO este bien antes de dejar pasar
  'nodejs-patterns': { cat: 'backend', title: 'Node.js Patterns', version: '20+', tags: ['api','middleware','streams'] }, // Node.js = para correr JavaScript en el servidor, como el cerebro detras de la pagina que nadie ve
  'prisma-sqlite': { cat: 'database', title: 'Prisma + SQLite', version: '6.7.0', tags: ['orm','sql','migrations'] }, // Prisma + SQLite = base de datos, como un Excel pero mas organizado, rapido y que no se corrompe cada dos por tres
  'ai-sdk-providers': { cat: 'ai-ml', title: 'AI Providers', version: '-', tags: ['openai','google','anthropic'] }, // AI Providers = los proveedores de IA, como OpenAI, Google, Anthropic, los que hacen los modelos que \"piensan\"
  'llm-agents': { cat: 'ai-ml', title: 'LLM Agents', version: '-', tags: ['agents','tools','capabilities'] }, // LLM Agents = agentes de IA que pueden hacer cosas solos, como un asistente virtual pero con superpoderes
  'expo-react-native': { cat: 'mobile', title: 'Expo + React Native', version: 'SDK 57', tags: ['mobile','ios','android'] }, // Expo + React Native = para hacer apps de celular con JavaScript, asi que no necesitas aprender Swift ni Kotlin, GENIAL
  'gsap': { cat: 'animation', title: 'GSAP', version: '3.15.0', tags: ['animation','scroll','timeline'] }, // GSAP = para hacer animaciones en la web, como los efectos de las peliculas de Marvel pero en tu pagina
  'threejs': { cat: 'animation', title: 'Three.js', version: '0.185.1', tags: ['webgl','3d','shaders'] }, // Three.js = para hacer graficos 3D en el navegador, como un videojuego pero en Chrome, wooooow
  'lottie': { cat: 'animation', title: 'Lottie', version: '2.4.1', tags: ['after-effects','animation'] }, // Lottie = para poner animaciones de After Effects en la web, como magia pero con archivos JSON
  'vitest': { cat: 'testing', title: 'Vitest', version: '3.0.9', tags: ['unit','mocking','coverage'] }, // Vitest = para probar el codigo, como un examen para ver si funciona bien o si explota todo
  'playwright': { cat: 'testing', title: 'Playwright', version: '1.62.1', tags: ['e2e','browser','automation'] }, // Playwright = para automatizar el navegador, como un robot que navega tu pagina y busca errores
  'cloudflare-workers': { cat: 'infra', title: 'Cloudflare Workers', version: '-', tags: ['edge','r2','d1'] }, // Cloudflare Workers = codigo que corre en la nube, como servidores virtuales que viven en internet
  'docker': { cat: 'infra', title: 'Docker', version: '-', tags: ['containers','compose'] }, // Docker = para empaquetar aplicaciones en \"contenedores\", como cajas que tienen todo lo que necesita tu app adentro
  'websocket': { cat: 'realtime', title: 'WebSocket', version: '-', tags: ['realtime','ws'] }, // WebSocket = para comunicacion en tiempo real, como un chat que se actualiza solo sin recargar
  'webrtc': { cat: 'realtime', title: 'WebRTC', version: '-', tags: ['p2p','video','data-channels'] }, // WebRTC = para video y audio en tiempo real, como Zoom pero directo en el navegador sin descargar nada
  'auth-patterns': { cat: 'security', title: 'Auth Patterns', version: '-', tags: ['jwt','oauth2','rbac','sessions'] }, // Auth = autenticacion, como la contraseña y usuario para entrar a tu cuenta, pero mas seguro
  'git-workflows': { cat: 'devops', title: 'Git Workflows', version: '-', tags: ['branching','ci-cd','hooks'] }, // Git = para guardar cambios del codigo, como un historial de versiones de un documento de Word pero mil veces mejor
  'npm-workspaces': { cat: 'devops', title: 'npm Workspaces', version: '-', tags: ['monorepo','packages'] }, // npm = gestor de paquetes de Node.js, como una tienda de apps para tu codigo, \"npm install\" es magia
  'eslint-prettier': { cat: 'tools', title: 'ESLint + Prettier', version: '-', tags: ['linting','formatting'] }, // ESLint + Prettier = para que el codigo se vea bonito y sin errores, como un editor de texto con OCD
  'repomix': { cat: 'tools', title: 'Repomix', version: '1.18.0', tags: ['repo-packaging','llm'] } // Repomix = para empaquetar todo el repositorio en un solo archivo, como una maleta de codigo para llevartelo a otro lado
};

const TECHNOLOGIES = [];
// TECHNOLOGIES es un array (lista) donde se guardan TODAS las tecnologias procesadas
// cada tecnologia tiene: slug, titulo, version, categoria, tags, secciones y contenido
// es como una coleccion de cartas Pokemon pero de tecnologias

techFiles.forEach(f => {
  // forEach = para cada archivo en la lista de archivos tech
  // es como un for pero mas bonito y facil de leer, \"para cada f haz esto\"

  const slug = f.replace('.md', ''); // le quitamos la extension .md para obtener el slug, o sea \"nextjs-15.md\" se convierte en \"nextjs-15\"
  // replace es como buscar y reemplazar en Word pero en codigo

  const content = fs.readFileSync(path.join(TECH_DIR, f), 'utf8'); // leemos TODO el contenido del archivo .md como string, sin piedad
  // es como copiar todo el texto de un libro y pegarlo en una variable

  const meta = TECH_MAP[slug] || { cat: 'tools', title: slug, version: '-', tags: [] };
  // buscamos en TECH_MAP la info de esta tecnologia por su slug
  // si no existe (el || es \"o si no\"), usamos valores por defecto: categoria tools, titulo = slug, sin version ni tags
  // asi nunca se rompe aunque haya un archivo nuevo que no conocemos

  const catInfo = TECH_CATEGORIES[meta.cat] || { nombre: 'Otros', icon: '📦', color: '#6366f1' };
  // buscamos la info de la categoria (nombre, icono, color)
  // si la categoria no existe en TECH_CATEGORIES, ponemos \"Otros\" con un cajon como icono

  // Extract sections
  // aca extraemos las secciones del markdown
  // las secciones empiezan con \"## \" en markdown
  // es como dividir el documento en capitulos, cada ## es un nuevo capitulo

  const sections = []; // lista de secciones que vamos a encontrar, al principio vacia

  let currentSection = null; // la seccion actual que estamos procesando, al principio es null (vacia, como un vaso sin agua)

  content.split('\n').forEach(line => {
    // split('\\n') divide el texto por saltos de linea, o sea cada linea se vuelve un elemento del array
    // forEach recorre cada linea UNA por una, como leer un libro linea por linea

    if (line.startsWith('## ')) {
      // startsWith('## ') = si la linea empieza con \"## \" (dos numerales y espacio)
      // en markdown eso significa que es un titulo de seccion, como un titular de periodico
      if (currentSection) sections.push(currentSection); // si ya teniamos una seccion guardada, la metemos al array de secciones
      currentSection = { title: line.replace('## ', ''), content: '' }; // creamos una NUEVA seccion con el titulo (sin los ##) y contenido vacio
    } else if (currentSection) {
      currentSection.content += line + '\n'; // si no es titulo, es CONTENIDO, lo agregamos a la seccion actual con un salto de linea
    }
  });
  if (currentSection) sections.push(currentSection); // al FINAL del archivo, si quedo una seccion sin guardar, la guardamos (porque el forEach no guarda la ultima)

  TECHNOLOGIES.push({
    slug, // el id bonito
    title: meta.title, // el nombre bonito que vemos en la UI
    version: meta.version, // la version, como \"15.3.3\" o \"-\" si no se sabe
    category: meta.cat, // la categoria (frontend, backend, etc)
    categoryName: catInfo.nombre, // el nombre de la categoria bonito
    categoryIcon: catInfo.icon, // el emoji de la categoria
    categoryColor: catInfo.color, // el color hex de la categoria
    tags: meta.tags, // las etiquetas para filtrar
    sections, // las secciones extraidas del markdown
    rawContent: content.substring(0, 5000) // first 5KB for preview
    // substring(0, 5000) = tomamos solo los PRIMEROS 5000 caracteres
    // es como un resumen, para no mostrar TODO el contenido en la vista previa
    // imaginate si un archivo tiene 50KB, no quieres cargar todo de una
  });
});

// Cross-reference: map books to technologies
// BOOK_TECH_MAP conecta libros con tecnologias, osea como un match de Tinder pero academico
// cada libro (por su slug de seccion) tiene una lista de tecnologias relacionadas
// por ejemplo, el libro de JavaScript esta relacionado con Next.js, React y Node.js

const BOOK_TECH_MAP = {
  'javascript': ['nextjs-15', 'react-19', 'nodejs-patterns'], // javascript esta relacionado con Next.js, React y Node.js porque todos usan JS
  'typescript': ['typescript-5', 'nextjs-15', 'react-19'], // typescript con TypeScript (obvio), Next.js y React
  'python': ['ai-sdk-providers', 'docker'], // python con AI Providers y Docker porque Python es EL lenguaje de IA
  'react': ['react-19', 'nextjs-15', 'tailwind-v4'], // react con React (obvio), Next.js y Tailwind porque van juntos como pan y mantequilla
  'nodejs': ['nodejs-patterns', 'vercel-ai-sdk'], // nodejs con Node.js patterns y Vercel AI SDK
  'angular': [], // angular NO tiene tecnologias relacionadas aun, pobre angular, lo olvidaron
  'vue': [], // vue tampoco, Vue.js es otro framework pero aca no hay docs de el, que triste
  'rust': [], // Rust es un lenguaje cool pero no tenemos docs de el, algun dia tal vez
  'golang': [], // Go de Google, tampoco tenemos, Google no nos caso
  'java': [], // Java clasico, sin docs, el abuelo que todos respetan pero nadie quiere usar
  'csharp': [], // C# de Microsoft, sin docs
  'cplusplus': [], // C++, el abuelo de los lenguajes modernos, sin docs
  'c': [], // C, el bisabuelo de TODO, sin docs
  'ruby': [], // Ruby, usado en Rails, sin docs, el lenguaje elegante
  'php': [], // PHP, el que hace WordPress, sin docs, el que todos critican pero todos usan
  'haskell': [], // Haskell, funcional y complicado, sin docs, para programadores filosofos
  'kotlin': ['expo-react-native'], // Kotlin esta relacionado con Expo React Native porque se usa en Android development
  'android': ['expo-react-native'], // Android tambien con Expo porque Expo te deja hacer apps Android con JS
  'sql': ['prisma-sqlite'], // SQL con Prisma y SQLite porque Prisma ES un ORM para SQL
  'nosql': ['prisma-sqlite'], // NoSQL tambien con Prisma (aunque SQLite es SQL, pero bueno, Prisma maneja ambos mundos)
  'docker': ['docker'], // Docker con Docker, obvio, es como decir que Coca-Cola esta relacionada con Coca-Cola
  'git': ['git-workflows'], // Git con Git Workflows porque Git ES el sistema de control de versiones
  'linux': ['docker'], // Linux con Docker porque Docker nacio en Linux y ahi corre mejor
  'ia': ['ai-sdk-providers', 'llm-agents'], // IA con AI Providers y LLM Agents porque la IA necesita proveedores y agentes
  'blockchain': [], // blockchain sin docs, las criptomonedas esperan pacientemente
  'html-css': ['tailwind-v4'], // HTML/CSS con Tailwind porque Tailwind ES para CSS
  'r': [], // R para estadisticas, sin docs, el lenguaje de los cientificos de datos
  'generales': [], // generales sin docs
  'algoritmos': [], // algoritmos sin docs, triste, los algoritmos merecen respeto
  'sistemas-operativos': [], // SO sin docs
  'metodologias': [], // metodologias sin docs
  'qwik': [], // Qwik es un framework nuevo y cool, sin docs aun
  'angular': [], // angular duplicado? bueno que quede ahi por si acaso
  'django': [], // Django de Python, sin docs, el framework web mas elegante
  'web': [] // web generico sin docs
};

// ===== BUILD HTML =====
// aca es donde la MAGIA REAL ocurre, se genera el HTML COMPLETO
// DATA es un objeto que tiene todos los datos que vamos a injectar en el HTML
// es como preparar los ingredientes antes de cocinar, \"aqui tienes todo, ahora cocinamelo\"

const DATA = { LIBROS, SECCIONES, CATEGORIAS, TECHNOLOGIES, TECH_CATEGORIES };

// el template literal (backticks `) permite crear strings MULTILINEA
// es como un documento donde puedes escribir en varias lineas sin acabarte el espacio
// adentro hay TODO: CSS + HTML + JavaScript, todo autocontenido

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tech Library — UltraIa</title>
<style>
/* omg esto es TODO el CSS de la pagina, como las instrucciones de estilo que le dicen a cada cosa como verse */
/* CSS = Cascading Style Sheets, o sea como se ve la pagina, los colores, tamanos, posiciones */

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
/* el asterisco significa \"TODO\", o sea le decimos a TODOS los elementos que tengan box-sizing border-box */
/* esto hace que el padding no aumente el tamano del elemento, es como magia de CSS basica */

:root{
  /* las variables CSS, como constantes que puedes usar en TODO el archivo */
  /* --canvas es el color de fondo principal, como el lienzo donde pintas tu obra maestra */
  --canvas:#08080a;--panel:#111115;--panel-hover:#16161c;--panel-active:#1c1c24;
  --border:#1f1f2a;--border-subtle:#15151e;
  --text:#e4e4e7;--text-secondary:#a1a1aa;--text-muted:#52525b;
  --primary:#8b5cf6;--primary-dim:#7c3aed;--primary-glow:rgba(139,92,246,0.15);
  --success:#22c55e;--warning:#f59e0b;--danger:#ef4444;
  --radius:8px;--radius-sm:6px;--radius-lg:12px;
  --shadow:0 4px 24px rgba(0,0,0,0.4);
  --font-sans:system-ui,-apple-system,sans-serif;
  --font-mono:ui-monospace,monospace;
}

html{font-size:15px;scroll-behavior:smooth}
/* scroll-behavior:smooth = cuando haces clic en un link, hace scroll SUAVE en vez de saltar como loco */

body{font-family:var(--font-sans);background:var(--canvas);color:var(--text);min-height:100vh;line-height:1.6}
/* body = el CUERPO de la pagina, todo lo que se ve, con el color oscuro de canvas */

a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
/* los links son MORADOS y sin subrayado, al pasar el mouse se subrayan para decir \"soy un link\" */

button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
/* los botones heredan la fuente del padre, son clickeables, sin borde ni fondo, minimalismo total */

input,textarea,select{font-family:inherit;color:var(--text);background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;outline:none}
/* los campos de texto tienen el estilo OSCURO del panel, como un terminal de hackers */

input:focus,textarea:focus{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-glow)}
/* al hacer FOCO (clic) en un campo, se ilumina el borde de MORADO, como un neón */

::selection{background:var(--primary);color:#fff}
/* cuando SELECTAS texto, se pone MORADO el fondo, estiloso */

::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
/* scrollbar personalizado, DELGADO y oscuro, nada de scrollbar fea default */

.app{display:flex;min-height:100vh}
/* flex layout, la pagina se divide en SIDEBAR y contenido principal, como un IDE de programacion */

.sidebar{width:280px;min-width:280px;background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:10;overflow-y:auto}
/* el SIDEBAR es la barra lateral izquierda, FIJA en la pantalla, no se mueve con el scroll */
/* position:fixed = queda pegada como un iman */

.sidebar-header{padding:20px;border-bottom:1px solid var(--border)}
/* header del sidebar con padding y borde abajo, como la parte de arriba de una app */

.sidebar-header h1{font-size:1.1rem;font-weight:700}
/* el TITULO del sidebar, \"Tech Library\" en negrita */

.sidebar-header .subtitle{font-size:0.72rem;color:var(--text-muted);margin-top:2px}
/* el subtitulo que muestra \"X libros - Y tecnologias - Offline\" en texto gris */

.sidebar-nav{flex:1;overflow-y:auto;padding:8px}
/* la NAVEGACION del sidebar, flexible y con scroll si hay muchos items */

.nav-section{margin-bottom:4px}
/* seccion de navegacion, separa las areas */

.nav-section-title{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);padding:8px 12px 4px;font-weight:600}
/* titulo de seccion en la navegacion, en MAYUSCULAS y pequeno, como una etiqueta de categoria */

.nav-item{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-secondary);transition:all 0.15s;cursor:pointer}
/* cada ITEM de navegacion, con transicion SUAVE al hover, como un menu de restaurante digital */

.nav-item:hover{background:var(--panel-hover);color:var(--text)}
/* al PASAR el mouse sobre un item, cambia el fondo, feedback visual */

.nav-item.active{background:var(--primary-glow);color:var(--primary);font-weight:500}
/* el item ACTIVO tiene fondo MORADO claro y texto morado, para decir \"estas aqui\" */

.nav-item .count{margin-left:auto;font-size:0.7rem;background:var(--border);padding:1px 6px;border-radius:10px;color:var(--text-muted)}
/* el CONTADOR de items a la derecha, en una bolita gris, como un badge de notificaciones */

.nav-item.active .count{background:rgba(139,92,246,0.2);color:var(--primary)}
/* el contador del item ACTIVO es MORADO tambien, coherente visual */

.sidebar-footer{padding:12px;border-top:1px solid var(--border);font-size:0.7rem;color:var(--text-muted);text-align:center}
/* footer del sidebar con la fecha de generacion, como un sello de fabrica */

.main{flex:1;margin-left:280px;display:flex;flex-direction:column;min-height:100vh}
/* el CONTENIDO principal, al lado del sidebar, con margen izquierdo de 280px para no taparlo */

.topbar{position:sticky;top:0;z-index:5;background:rgba(8,8,10,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:12px}
/* topbar = barra superior, STICKY para que se quede ARriba al hacer scroll */
/* backdrop-filter:blur = efecto de DESENFOQUE detras, como vidrio esmerilado, MUY aesthetic */

.search-box{flex:1;position:relative}
/* el CUADRO de busqueda, ocupa todo el espacio disponible */

.search-box input{width:100%;padding:10px 16px 10px 40px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem}
/* el INPUT de busqueda con padding IZQUIERDO para dejar espacio al icono de lupa */

.search-box .icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)}
/* el ICONO de lupa dentro del input, centrado verticalmente con magia de CSS */

.filter-pills{display:flex;gap:6px;flex-wrap:wrap}
/* los FILTROS tipo \"pastilla\" al lado del busqueda, se envuelven si no caben */

.pill{padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:500;border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s;cursor:pointer;white-space:nowrap}
/* cada PILL es un botonito REDONDO para filtrar, como pastillas de colores */

.pill:hover{border-color:var(--primary);color:var(--text)}
/* al HOVER se pone MORADO, feedback visual*/

.pill.active{background:var(--primary);color:#fff;border-color:var(--primary)}
/* pill ACTIVO = MORADO con texto BLANCO, seleccionado */

.pill.book-pill{border-color:rgba(34,197,94,0.3);color:var(--success)}
/* pill de LIBROS es VERDE, para diferenciar de tech */

.pill.book-pill.active{background:var(--success);border-color:var(--success)}
/* pill de libro ACTIVO = VERDE lleno */

.pill.tech-pill{border-color:rgba(139,92,246,0.3);color:var(--primary)}
/* pill de TECH es MORADO */

.pill.tech-pill.active{background:var(--primary);border-color:var(--primary)}
/* pill de tech ACTIVO = MORADO lleno */

.result-count{font-size:0.75rem;color:var(--text-muted);white-space:nowrap}
/* el CONTADOR de resultados \"X / Y\" en texto gris pequeño */

.content{flex:1;padding:24px}
/* el AREA de contenido principal, flexible y con padding */

.books-grid,.tech-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
/* grid RESPONSIVE, las tarjetas se acomodan SOLAS segun el ancho de la pantalla */
/* repeat(auto-fill, minmax(320px, 1fr)) = tantas columnas como QUEPAN, minimo 320px cada una */

.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;transition:all 0.2s;display:flex;flex-direction:column}
/* cada TARJETA de libro/tech, con fondo oscuro y bordes redondeados */

.card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:var(--shadow)}
/* al HOVER, la tarjeta SUBE 2px y se ilumina el borde, efecto \"lift\" que queda genial */

.card .card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
/* header de la tarjeta, flex para alinear titulo y acciones */

.card .card-title{font-size:0.95rem;font-weight:600;line-height:1.4;flex:1}
/* titulo de la tarjeta, negrita y legible */

.card .card-subtitle{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
/* subtitulo (autor o version) en gris secundario */

.card .card-meta{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center}
/* METADATA de la tarjeta, badges y tags envueltos si no caben */

.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:500}
/* badge = como una ETIQUETA pequeñita que muestra info extra */

.badge-format{background:rgba(139,92,246,0.12);color:var(--primary)}
/* badge de FORMATO en morado */

.badge-section{background:rgba(34,197,94,0.1);color:var(--success)}
/* badge de SECCION en verde */

.badge-category{background:rgba(245,158,11,0.1);color:var(--warning)}
/* badge de CATEGORIA en amarillo/naranja */

.badge-tech{background:rgba(236,72,153,0.1);color:#ec4899}
/* badge de TECH en rosa */

.badge-version{background:rgba(6,182,212,0.1);color:#06b6d4}
/* badge de VERSION en cyan */

.card .card-actions{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle)}
/* ACCIONES de la tarjeta (favorito, leer, notas), separadas con borde */

.card .card-actions button{padding:6px 12px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s}
/* cada boton de accion */

.card .card-actions button:hover{border-color:var(--primary);color:var(--text)}
/* hover morado en los botones de accion */

.card .card-actions .btn-fav.active{background:rgba(245,158,11,0.15);color:var(--warning);border-color:var(--warning)}
/* boton de FAVORITO activo en amarillo/naranja */

.card .card-actions .btn-read.active{background:rgba(34,197,94,0.15);color:var(--success);border-color:var(--success)}
/* boton de LEER activo en verde */

.card .card-notes{margin-top:8px;padding:8px 12px;background:var(--canvas);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--text-secondary);border:1px solid var(--border-subtle);display:none}
/* area de NOTAS, OCULTA por defecto, se muestra al clickear */

.card .card-notes.visible{display:block}
/* cuando tiene la clase visible, se MUESTRA */

.card .card-notes textarea{width:100%;min-height:60px;background:transparent;border:none;color:var(--text);font-size:0.78rem;resize:vertical;padding:0}
/* textarea de las notas, transparente y sin borde, minimalista */

.card .related{margin-top:10px;font-size:0.72rem;color:var(--text-muted)}
/* seccion de libros RELACIONADOS en la tarjeta */

.card .related a{font-size:0.72rem;margin-right:8px}
/* links de relacionados pequenos */

.view{display:none}.view.active{display:block}
/* las vistas estan OCULTAS por defecto, solo se muestra la que tiene .active */

.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px}
/* grid de estadisticas, responsivo */

.stat-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;text-align:center;cursor:pointer;transition:all 0.2s}
/* cada tarjeta de ESTADISTICA, clickable */

.stat-card:hover{border-color:var(--primary);transform:translateY(-2px)}
/* hover lift en stat cards */

.stat-card .stat-value{font-size:2rem;font-weight:700;color:var(--primary)}
/* el NUMERO grande de la estadistica en morado */

.stat-card .stat-label{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
/* la etiqueta debajo del numero */

.book-detail,.tech-detail{max-width:800px;margin:0 auto}
/* vista de DETALLE, centrada y con ancho maximo para que se lea bien */

.book-detail h2,.tech-detail h2{font-size:1.5rem;font-weight:700;margin-bottom:8px}
/* titulo del detalle grande y negrita */

.detail-meta{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
/* metadata del detalle */

.detail-desc{color:var(--text-secondary);margin:16px 0;line-height:1.7}
/* descripcion del detalle con line-height amplio para legibilidad */

.detail-actions{display:flex;gap:8px;margin:20px 0;flex-wrap:wrap}
/* acciones del detalle */

.detail-actions a,.detail-actions button{padding:10px 20px;border-radius:var(--radius);font-weight:500;font-size:0.85rem;border:1px solid var(--border);transition:all 0.15s}
/* botones grandes del detalle */

.detail-actions .btn-primary{background:var(--primary);color:#fff;border-color:var(--primary)}
/* boton PRIMARIO morado con texto blanco */

.detail-actions .btn-primary:hover{background:var(--primary-dim)}
/* hover del boton primario se oscurece un poco */

.related-section{margin-top:32px;padding-top:20px;border-top:1px solid var(--border)}
/* seccion de RELACIONADOS debajo del detalle */

.related-section h3{font-size:1rem;font-weight:600;margin-bottom:12px}
/* titulo de la seccion de relacionados */

.tech-content{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin:16px 0}
/* CONTENIDO de la tecnologia, panel oscuro */

.tech-content h3{font-size:1rem;font-weight:600;margin:16px 0 8px;color:var(--primary)}
/* subtitulos del contenido en morado */

.tech-content pre{background:var(--canvas);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;overflow-x:auto;font-size:0.8rem;font-family:var(--font-mono);margin:8px 0}
/* bloques de CODIGO con fondo mas oscuro y scroll horizontal */

.tech-content code{font-family:var(--font-mono);font-size:0.85em;background:var(--canvas);padding:1px 4px;border-radius:3px}
/* codigo INLINE en una linea */

.tech-content pre code{background:none;padding:0}
/* codigo DENTRO de un bloque pre no tiene background doble */

.tech-content ul,.tech-content ol{padding-left:20px;margin:8px 0}
/* listas con padding izquierdo */

.tech-content li{margin:4px 0;color:var(--text-secondary)}
/* items de lista en gris */

.tech-content p{margin:8px 0;color:var(--text-secondary)}
/* parrafos en gris secundario */

.tech-content strong{color:var(--text)}
/* texto NEGRO en negrita */

.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}
/* estado VACIO cuando no hay resultados, centrado y con mucho padding */

.empty-state .icon{font-size:3rem;margin-bottom:12px}
/* icono del estado vacio GRANDE */

.tag-list{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
/* lista de TAGS, envueltos */

.tag{font-size:0.65rem;padding:1px 6px;background:var(--border);border-radius:8px;color:var(--text-muted)}
/* cada TAG pequenito con fondo gris */

@media(max-width:768px){.sidebar{transform:translateX(-100%);transition:transform 0.3s}.sidebar.open{transform:translateX(0)}.main{margin-left:0}.books-grid,.tech-grid{grid-template-columns:1fr}.mobile-toggle{display:flex!important}}
/* RESPONSIVE: en movil, el sidebar se ESCONDE a la izquierda y se muestra con toggle */
/* las grids se vuelven de UNA sola columna */

.mobile-toggle{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--radius-sm);border:1px solid var(--border)}
/* boton de toggle del sidebar, OCULTO en desktop */

.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9}.overlay.visible{display:block}
/* OVERLAY oscuro detras del sidebar en movil */

.shortcuts-hint{position:fixed;bottom:16px;right:16px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:8px 14px;font-size:0.7rem;color:var(--text-muted);z-index:20;display:flex;gap:12px}
/* pista de ATAJOS de teclado en la esquina inferior derecha */

kbd{display:inline-block;padding:1px 5px;background:var(--canvas);border:1px solid var(--border);border-radius:3px;font-family:var(--font-mono);font-size:0.65rem}
/* etiqueta de tecla, estilo terminal */

.tab-bar{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px}
/* barra de TABS */

.tab{padding:10px 20px;font-size:0.85rem;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;transition:all 0.15s;cursor:pointer}
/* cada TAB */

.tab:hover{color:var(--text)}
/* hover del tab */

.tab.active{color:var(--primary);border-bottom-color:var(--primary)}
/* tab ACTIVO morado con borde abajo */
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>📚 Tech Library</h1>
      <!-- el TITULO de la app con emoji de libros -->
      <div class="subtitle">\${LIBROS.length} libros · \${TECHNOLOGIES.length} tecnologías · Offline</div>
      <!-- subtitulo DINAMICO que muestra la cantidad de libros y techs, y que funciona offline -->
    </div>
    <nav class="sidebar-nav" id="sidebarNav"></nav>
    <!-- la navegacion se llena DESDE JavaScript, por eso esta vacia ahi -->
    <div class="sidebar-footer">UltraIa · Sin conexión · \${new Date().toISOString().split('T')[0]}</div>
    <!-- footer con la FECHA de hoy generada con JavaScript -->
  </aside>
  <div class="overlay" id="overlay"></div>
  <!-- overlay para cuando se abre el sidebar en movil -->
  <div class="main">
    <div class="topbar">
      <button class="mobile-toggle" onclick="toggleSidebar()">☰</button>
      <!-- boton hamburguesa para abrir sidebar en movil -->
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Buscar libros, tecnologías... (Ctrl+K)" autocomplete="off">
        <!-- el INPUT de busqueda con placeholder que indica el atajo de teclado -->
      </div>
      <div class="filter-pills" id="filterPills"></div>
      <!-- los filtros se llenan desde JavaScript -->
      <span class="result-count" id="resultCount"></span>
      <!-- contador de resultados, se actualiza dinamicamente -->
    </div>
    <div class="content" id="content"></div>
    <!-- el CONTENIDO principal, se renderiza todo desde JavaScript -->
  </div>
  <div class="shortcuts-hint">
    <span><kbd>/</kbd> Buscar</span>
    <span><kbd>Esc</kbd> Limpiar</span>
    <span><kbd>1-2</kbd> Tab</span>
    <!-- pistas de atajos de teclado para el usuario -->
  </div>
</div>

<script>
// ===== DATA =====
// Aca METEMOS todos los datos del servidor al navegador via template literals
// es como empacar toda la base de datos en el HTML para que funcione OFFLINE

const LIBROS = \${JSON.stringify(LIBROS)};
// JSON.stringify convierte el objeto JS a texto JSON para injectarlo en el HTML
// es como fotografiar el objeto y pegar la foto en el codigo

const SECCIONES = \${JSON.stringify(SECCIONES)};
const CATEGORIAS = \${JSON.stringify(CATEGORIAS)};
const TECHNOLOGIES = \${JSON.stringify(TECHNOLOGIES)};
const TECH_CATEGORIES = \${JSON.stringify(TECH_CATEGORIES)};
const BOOK_TECH_MAP = \${JSON.stringify(BOOK_TECH_MAP)};

// ===== STATE =====
// STATE = el ESTADO de la aplicacion, como la memoria del navegador
// aqui se guarda QUE esta viendo el usuario, que filtro tiene activo, que favoritos tiene, etc

let state = {
  tab: 'books', // books | tech | stats — QUE pestana esta activa
  view: 'list', // list | detail — si esta en lista o viendo el detalle de algo
  search: '', // el texto de busqueda actual
  categoryFilter: null, // el filtro de categoria activo, null = sin filtro
  sectionFilter: null, // el filtro de seccion activo
  formatFilter: null, // el filtro de formato (PDF, HTML, eBook)
  techCategoryFilter: null, // el filtro de categoria de tech
  favorites: JSON.parse(localStorage.getItem('tl_favorites') || '[]'),
  // favoritos de LIBROS guardados en localStorage, o sea en el disco duro del navegador
  // si no hay nada guardado, empieza con un array vacio []
  read: JSON.parse(localStorage.getItem('tl_read') || '[]'),
  // libros QUE YA LEISTE, guardados en localStorage
  notes: JSON.parse(localStorage.getItem('tl_notes') || '{}'),
  // NOTAS que escribiste por libro, guardadas en localStorage como objeto {}
  techFavorites: JSON.parse(localStorage.getItem('tl_tech_favorites') || '[]'),
  // favoritos de TECHNOLOGIAS
  selectedBook: null, // el libro QUE ESTAS VIENDO en detalle, null = ninguno
  selectedTech: null, // la tecnologia que estas viendo en detalle
  sort: 'title' // como estan ORDENADOS los libros: 'title' = por titulo, 'author' = por autor
};

function saveState() {
  // saveState = guardar el estado actual en localStorage
  // es como guardar tu progreso en un videojame, para que cuando recargues la pagina sigas donde estabas
  localStorage.setItem('tl_favorites', JSON.stringify(state.favorites));
  localStorage.setItem('tl_read', JSON.stringify(state.read));
  localStorage.setItem('tl_notes', JSON.stringify(state.notes));
  localStorage.setItem('tl_tech_favorites', JSON.stringify(state.techFavorites));
}

function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
// esc = ESCAPAR texto para HTML, o sea reemplazar caracteres peligrosos por sus equivalentes seguros
// & se convierte en &amp; , < en &lt; , > en &gt; , \" en &quot;
// esto PREVENE ataques XSS donde alguien pone codigo malicioso en el titulo de un libro
// es como un guardia de seguridad que revisa todo lo que entra

function quitarAcentos(s) { return s.normalize('NFD').replace(/\\\\p{Diacritic}/gu,'').toLowerCase(); }
// quitarAcentos = quitar los acentos y convertir a minusculas para busquedas
// asi \"Angular\" y \"angular\" y \"ANGULAR\" y \"ANGúLAR\" buscan lo mismo
// normalize('NFD') separa las letras de sus acentos, luego replace los quita

function seccionInfo(id) { return SECCIONES.find(s=>s.id===id)||{titulo:id,descripcion:'',categoria:''}; }
// seccionInfo = buscar la info de una seccion por su ID
// .find() busca en el array el primer elemento que cumpla la condicion
// si no la encuentra, devuelve un objeto vacio con valores por defecto

function categoriaInfo(id) { return CATEGORIAS.find(c=>c.id===id)||{nombre:id}; }
// categoriaInfo = buscar el nombre de una categoria por su ID

function countByCategory(catId) { return SECCIONES.filter(s=>s.categoria===catId).reduce((a,s)=>a+LIBROS.filter(l=>l.seccion===s.id).length,0); }
// countByCategory = contar cuantos libros hay en una categoria
// primero filtra las secciones de esa categoria, luego por cada seccion cuenta sus libros
// reduce suma todo en un solo numero, empezando desde 0

function countBySection(secId) { return LIBROS.filter(l=>l.seccion===secId).length; }
// countBySection = contar cuantos libros hay en una seccion especifica

function isFav(i){return state.favorites.includes(i)}
// isFav = verificar si un libro esta en favoritos, includes() retorna true/false

function isRead(i){return state.read.includes(i)}
// isRead = verificar si un libro ya fue leido

function isTechFav(s){return state.techFavorites.includes(s)}
// isTechFav = verificar si una tecnologia esta en favoritos

function toggleFav(i,e){e&&e.stopPropagation();const x=state.favorites.indexOf(i);if(x>=0)state.favorites.splice(x,1);else state.favorites.push(i);saveState();render()}
// toggleFav = AGREGAR o QUITAR un libro de favoritos
// indexOf busca la posicion, si es >=0 significa que YA esta, lo quitamos con splice
// si NO esta, lo agregamos con push
// e.stopPropagation() evita que el clic se \"propage\" al padre (que abra el libro)
// luego guardamos el estado y RE-RENDERIZAMOS toda la UI

function toggleRead(i,e){e&&e.stopPropagation();const x=state.read.indexOf(i);if(x>=0)state.read.splice(x,1);else state.read.push(i);saveState();render()}
// toggleRead = marcar/desmarcar un libro como leido, misma logica que toggleFav

function toggleTechFav(s,e){e&&e.stopPropagation();const x=state.techFavorites.indexOf(s);if(x>=0)state.techFavorites.splice(x,1);else state.techFavorites.push(s);saveState();render()}
// toggleTechFav = favorito de tecnologia, misma logica pero con strings (slug) en vez de indices

function toggleNotes(i,e){e&&e.stopPropagation();const c=document.querySelector('[data-book="'+i+'"] .card-notes');if(c)c.classList.toggle('visible')}
// toggleNotes = MOSTRAR u OCULTAR el area de notas de un libro
// querySelector busca el elemento con data-book=i y la clase .card-notes
// classList.toggle('visible') agrega o quita la clase visible

function saveNote(i,t){state.notes[i]=t;saveState()}
// saveNote = guardar una nota para un libro en el estado

// ===== FILTERING =====
// FUNCIONES de filtrado, como un colador que separa lo que quieres de lo que no

function getFilteredBooks() {
  let books = LIBROS.map((b,i)=>({...b,_idx:i}));
  // .map crea una NUEVA lista con los libros pero agregando _idx (indice original)
  // {...b} copia todas las propiedades del libro, _idx es el indice para poder abrirlo

  if(state.search){
    // SI hay texto de busqueda, filtrar por el
    const terms=quitarAcentos(state.search).split(/\\\\s+/).filter(Boolean);
    // split separa por ESPACIOS, filter(Boolean) quita strings vacios
    // asi que \"react hooks\" se convierte en [\"react\", \"hooks\"]
    books=books.filter(b=>{
      const t=quitarAcentos(b.titulo),a=b.autor?quitarAcentos(b.autor):'',s=quitarAcentos(seccionInfo(b.seccion).titulo);
      return terms.every(x=>t.includes(x)||a.includes(x)||s.includes(x));
      // every = TODOS los terminos deben aparecer en titulo, autor O seccion
    });
  }
  if(state.categoryFilter){
    const ids=SECCIONES.filter(s=>s.categoria===state.categoryFilter).map(s=>s.id);
    books=books.filter(b=>ids.includes(b.seccion));
    // filtrar por CATEGORIA: primero buscar las secciones de esa categoria, luego filtrar libros de esas secciones
  }
  if(state.sectionFilter) books=books.filter(b=>b.seccion===state.sectionFilter);
  // filtrar por SECCION especifica
  if(state.formatFilter){
    if(state.formatFilter==='none') books=books.filter(b=>!b.formato);
    // si el filtro es \"none\", mostrar solo libros SIN formato
    else books=books.filter(b=>b.formato&&quitarAcentos(b.formato).includes(quitarAcentos(state.formatFilter)));
    // si es \"PDF\", \"HTML\" o \"eBook\", filtrar por formato
  }
  books.sort((a,b)=>{
    if(state.sort==='author') return(a.autor||'zzz').localeCompare(b.autor||'zzz','es');
    if(state.sort==='section') return a.seccion.localeCompare(b.seccion)||a.titulo.localeCompare(b.titulo,'es');
    return a.titulo.localeCompare(b.titulo,'es');
    // ORDENAR: por titulo, autor o seccion usando localeCompare con localizacion espanola
  });
  return books;
}

function getFilteredTech() {
  let tech = [...TECHNOLOGIES];
  // copia del array original para no modificarlo
  if(state.search){
    const terms=quitarAcentos(state.search).split(/\\\\s+/).filter(Boolean);
    tech=tech.filter(t=>{
      const ti=quitarAcentos(t.title),ta=t.tags.join(' '),cat=quitarAcentos(t.categoryName);
      return terms.every(x=>ti.includes(x)||ta.includes(x)||cat.includes(x));
    });
    // buscar en titulo, tags O nombre de categoria
  }
  if(state.techCategoryFilter) tech=tech.filter(t=>t.category===state.techCategoryFilter);
  // filtrar por categoria de tech
  return tech;
}

// ===== SIDEBAR =====
// renderSidebar = DIBUJAR el sidebar con la navegacion actualizada

function renderSidebar() {
  const nav=document.getElementById('sidebarNav');
  // obtener el elemento nav del sidebar por su ID
  let h='<div class="nav-section">';
  // h = HTML que estamos construyendo como string
  // es como armar un rompecabezas de HTML pieza por pieza

  h+='<div class="nav-item'+(state.tab==='books'?' active':'')+'" onclick="switchTab(\'books\')">';
  h+='📚 <span>Libros</span><span class="count">'+LIBROS.length+'</span></div>';
  // item de LIBROS con contador, activo si estamos en pestana books

  h+='<div class="nav-item'+(state.tab==='tech'?' active':'')+'" onclick="switchTab(\'tech\')">';
  h+='⚡ <span>Tecnologías</span><span class="count">'+TECHNOLOGIES.length+'</span></div>';
  // item de TECNOLOGIAS con contador

  h+='<div class="nav-item'+(state.tab==='stats'?' active':'')+'" onclick="switchTab(\'stats\')">';
  h+='📊 <span>Estadísticas</span></div>';
  // item de ESTADISTICAS, sin contador

  h+='</div>';

  if(state.tab==='books'){
    // SI estamos en la pestana de libros, mostrar categorias de libros
    h+='<div class="nav-section"><div class="nav-section-title">Categorías</div>';
    CATEGORIAS.forEach(c=>{
      const n=countByCategory(c.id);
      h+='<div class="nav-item'+(state.categoryFilter===c.id?' active':'')+'" onclick="filterCat(\''+c.id+'\')"><span>'+c.nombre+'</span><span class="count">'+n+'</span></div>';
    });
    h+='</div>';
    // si hay una categoria seleccionada, mostrar sus SECCIONES
    if(state.categoryFilter){
      const secs=SECCIONES.filter(s=>s.categoria===state.categoryFilter);
      h+='<div class="nav-section"><div class="nav-section-title">Secciones</div>';
      secs.forEach(s=>{
        const n=countBySection(s.id);
        h+='<div class="nav-item'+(state.sectionFilter===s.id?' active':'')+'" onclick="filterSec(\''+s.id+'\')"><span>'+s.titulo+'</span><span class="count">'+n+'</span></div>';
      });
      h+='</div>';
    }
  }
  if(state.tab==='tech'){
    // SI estamos en la pestana de tecnologias, mostrar categorias de tech
    h+='<div class="nav-section"><div class="nav-section-title">Categorías</div>';
    Object.entries(TECH_CATEGORIES).forEach(([k,v])=>{
      const n=TECHNOLOGIES.filter(t=>t.category===k).length;
      if(n>0) h+='<div class="nav-item'+(state.techCategoryFilter===k?' active':'')+'" onclick="filterTechCat(\''+k+'\')"><span>'+v.icon+' '+v.nombre+'</span><span class="count">'+n+'</span></div>';
    });
    h+='</div>';
  }
  nav.innerHTML=h;
  // innerHTML = reemplazar TODO el contenido del nav con el HTML nuevo
  // es como borrar y reescribir el menu completo de golpe
}

function renderFilterPills() {
  const c=document.getElementById('filterPills');
  let h='';
  if(state.tab==='books'){
    // en la pestana de libros, mostrar pills de formato y orden
    ['PDF','HTML','eBook'].forEach(f=>{
      h+='<button class="pill book-pill'+(state.formatFilter===f?' active':'')+'" onclick="filterFmt(\''+f+'\')">'+f+'</button>';
    });
    h+='<button class="pill'+(state.sort==='title'?' active':'')+'" onclick="setSort(\'title\')">A-Z</button>';
    h+='<button class="pill'+(state.sort==='author'?' active':'')+'" onclick="setSort(\'author\')">Autor</button>';
  }
  c.innerHTML=h;
}

// ===== CARD RENDERERS =====
// Funciones que GENERAN el HTML de cada tarjeta

function renderBookCard(b,idx) {
  const sec=seccionInfo(b.seccion),cat=categoriaInfo(sec.categoria);
  // obtener info de seccion y categoria del libro
  const related=LIBROS.filter(l=>l.seccion===b.seccion&&LIBROS.indexOf(l)!==idx).slice(0,3);
  // libros RELACIONADOS: mismos en la misma seccion pero que NO sean el actual, maximo 3
  const techLinks=(BOOK_TECH_MAP[b.seccion]||[]).filter(Boolean).slice(0,3);
  // tecnologias relacionadas con la seccion del libro, maximo 3

  let h='<div class="card" data-book="'+idx+'" onclick="openBook('+idx+')">';
  // data-book = atributo custom para poder encontrar esta tarjeta despues
  h+='<div class="card-header"><div class="card-title">'+esc(b.titulo)+'</div></div>';
  // titulo ESCAPADO para prevenir XSS
  if(b.autor) h+='<div class="card-subtitle">'+esc(b.autor)+'</div>';
  h+='<div class="card-meta">';
  if(b.formato) h+='<span class="badge badge-format">'+esc(b.formato)+'</span>';
  h+='<span class="badge badge-section">'+esc(sec.titulo)+'</span>';
  h+='</div>';

  if(techLinks.length>0){
    h+='<div class="tag-list">';
    techLinks.forEach(t=>{
      const ti=TECHNOLOGIES.find(x=>x.slug===t);
      if(ti) h+='<span class="tag" onclick="event.stopPropagation();openTech(\''+t+'\')" style="cursor:pointer" title="Ver docs de '+esc(ti.title)+'">⚡ '+esc(ti.title)+'</span>';
    });
    h+='</div>';
  }

  h+='<div class="card-actions">';
  h+='<button class="btn-fav'+(isFav(idx)?' active':'')+'" onclick="toggleFav('+idx+',event)">'+(isFav(idx)?'⭐':'☆')+' Fav</button>';
  h+='<button class="btn-read'+(isRead(idx)?' active':'')+'" onclick="toggleRead('+idx+',event)">'+(isRead(idx)?'✅':'📖')+' Leer</button>';
  h+='<button onclick="toggleNotes('+idx+',event)">📝</button>';
  h+='</div>';

  const note=state.notes[idx]||'';
  h+='<div class="card-notes'+(note?' visible':'')+'"><textarea placeholder="Nota..." onclick="event.stopPropagation()" onblur="saveNote('+idx+',this.value)">'+esc(note)+'</textarea></div>';
  // area de notas con textarea, se guarda al quitar el foco (onblur)

  if(related.length>0){
    h+='<div class="related">📚 ';
    related.forEach(r=>{
      const ri=LIBROS.indexOf(r);
      h+='<a href="javascript:void(0)" onclick="openBook('+ri+');event.stopPropagation()">'+esc(r.titulo.substring(0,25))+'</a>';
    });
    h+='</div>';
  }
  h+='</div>';return h;
}

function renderTechCard(t) {
  const catInfo=TECH_CATEGORIES[t.category]||{icon:'📦',color:'#6366f1'};
  let h='<div class="card" onclick="openTech(\''+t.slug+'\')">';
  h+='<div class="card-header"><div class="card-title">'+catInfo.icon+' '+esc(t.title)+'</div></div>';
  if(t.version&&t.version!=='-') h+='<div class="card-subtitle">v'+esc(t.version)+'</div>';
  h+='<div class="card-meta">';
  h+='<span class="badge badge-tech">'+esc(t.categoryName)+'</span>';
  h+='</div>';
  h+='<div class="tag-list">';
  t.tags.forEach(tag=>h+='<span class="tag">'+esc(tag)+'</span>');
  h+='</div>';
  h+='<div class="card-actions">';
  h+='<button class="btn-fav'+(isTechFav(t.slug)?' active':'')+'" onclick="toggleTechFav(\''+t.slug+'\',event)">'+(isTechFav(t.slug)?'⭐':'☆')+' Fav</button>';
  h+='</div></div>';return h;
}

// ===== VIEWS =====
// Funciones que generan las VISTAS COMPLETAS

function renderBooksView() {
  const books=getFilteredBooks();
  let h='';
  if(!state.search&&!state.categoryFilter&&!state.sectionFilter&&!state.formatFilter){
    // si NO hay filtros activos, mostrar RESUMEN de estadisticas arriba
    h+='<div class="stats-grid">';
    h+='<div class="stat-card"><div class="stat-value">'+LIBROS.length+'</div><div class="stat-label">Libros</div></div>';
    h+='<div class="stat-card"><div class="stat-value">'+SECCIONES.length+'</div><div class="stat-label">Secciones</div></div>';
    h+='<div class="stat-card"><div class="stat-value">'+state.favorites.length+'</div><div class="stat-label">Favoritos</div></div>';
    h+='<div class="stat-card"><div class="stat-value">'+state.read.length+'</div><div class="stat-label">Leídos</div></div>';
    h+='</div>';
  }
  h+='<div class="books-grid">';
  if(books.length===0) h+='<div class="empty-state"><div class="icon">📭</div><p>Sin resultados</p></div>';
  else books.forEach(b=>{h+=renderBookCard(b,b._idx)});
  h+='</div>';return h;
}

function renderTechView() {
  const tech=getFilteredTech();
  let h='<div class="tech-grid">';
  if(tech.length===0) h+='<div class="empty-state"><div class="icon">📭</div><p>Sin resultados</p></div>';
  else tech.forEach(t=>{h+=renderTechCard(t)});
  h+='</div>';return h;
}

function renderStatsView() {
  let h='<h2 style="margin-bottom:20px">📊 Estadísticas</h2>';
  h+='<div class="tab-bar"><div class="tab active">General</div></div>';
  h+='<div class="stats-grid">';
  h+='<div class="stat-card"><div class="stat-value">'+LIBROS.length+'</div><div class="stat-label">Libros</div></div>';
  h+='<div class="stat-card"><div class="stat-value">'+TECHNOLOGIES.length+'</div><div class="stat-label">Tecnologías</div></div>';
  h+='<div class="stat-card"><div class="stat-value">'+SECCIONES.length+'</div><div class="stat-label">Secciones Libros</div></div>';
  h+='<div class="stat-card"><div class="stat-value">'+Object.keys(TECH_CATEGORIES).length+'</div><div class="stat-label">Categorías Tech</div></div>';
  h+='</div>';

  h+='<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Libros por Categoría</h3>';
  h+='<div class="stats-grid">';
  CATEGORIAS.forEach(c=>{
    const n=countByCategory(c.id);
    h+='<div class="stat-card" onclick="switchTab(\'books\');filterCat(\''+c.id+'\')"><div class="stat-value">'+n+'</div><div class="stat-label">'+c.nombre+'</div></div>';
  });
  h+='</div>';

  h+='<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Tech por Categoría</h3>';
  h+='<div class="stats-grid">';
  Object.entries(TECH_CATEGORIES).forEach(([k,v])=>{
    const n=TECHNOLOGIES.filter(t=>t.category===k).length;
    if(n>0) h+='<div class="stat-card" onclick="switchTab(\'tech\');filterTechCat(\''+k+'\')"><div class="stat-value">'+n+'</div><div class="stat-label">'+v.icon+' '+v.nombre+'</div></div>';
  });
  h+='</div>';

  h+='<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Mi Progreso</h3>';
  h+='<div class="stats-grid">';
  h+='<div class="stat-card"><div class="stat-value">'+state.read.length+'</div><div class="stat-label">Libros Leídos</div></div>';
  h+='<div class="stat-card"><div class="stat-value">'+state.favorites.length+'</div><div class="stat-label">Libros Fav</div></div>';
  h+='<div class="stat-card"><div class="stat-value">'+state.techFavorites.length+'</div><div class="stat-label">Tech Fav</div></div>';
  const nc=Object.keys(state.notes).filter(k=>state.notes[k].trim()).length;
  h+='<div class="stat-card"><div class="stat-value">'+nc+'</div><div class="stat-label">Con Notas</div></div>';
  h+='</div>';return h;
}

function renderBookDetail(idx) {
  const b=LIBROS[idx],sec=seccionInfo(b.seccion),cat=categoriaInfo(sec.categoria);
  const related=LIBROS.filter(l=>l.seccion===b.seccion&&LIBROS.indexOf(l)!==idx).slice(0,6);
  const sameCat=LIBROS.filter(l=>{
    const s=seccionInfo(l.seccion);
    return s.categoria===sec.categoria&&l.seccion!==b.seccion;
  }).slice(0,6);
  const techLinks=(BOOK_TECH_MAP[b.seccion]||[]).filter(Boolean);

  let h='<div class="book-detail">';
  h+='<button onclick="goBack()" style="margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">← Volver</button>';
  // boton de VOLVER a la lista
  h+='<h2>'+esc(b.titulo)+'</h2>';
  if(b.autor) h+='<p style="color:var(--text-secondary)">por '+esc(b.autor)+'</p>';
  h+='<div class="detail-meta">';
  if(b.formato) h+='<span class="badge badge-format">'+esc(b.formato)+'</span>';
  h+='<span class="badge badge-section">'+esc(sec.titulo)+'</span>';
  h+='<span class="badge badge-category">'+esc(cat.nombre)+'</span>';
  h+='</div>';
  h+='<p class="detail-desc">'+esc(sec.descripcion)+'</p>';

  if(techLinks.length>0){
    h+='<div style="margin:16px 0"><h3 style="font-size:0.9rem;margin-bottom:8px">⚡ Tecnologías relacionadas</h3><div style="display:flex;gap:8px;flex-wrap:wrap">';
    techLinks.forEach(t=>{
      const ti=TECHNOLOGIES.find(x=>x.slug===t);
      if(ti) h+='<button onclick="openTech(\''+t+'\')" style="padding:6px 14px;border-radius:20px;font-size:0.8rem;border:1px solid var(--primary);color:var(--primary);background:var(--primary-glow)">'+esc(ti.title)+'</button>';
    });
    h+='</div></div>';
  }

  h+='<div class="detail-actions">';
  h+='<a href="'+esc(b.url)+'" target="_blank" rel="noopener" class="btn-primary">🔗 Abrir recurso</a>';
  h+='<button onclick="toggleFav('+idx+')" style="border:1px solid var(--border)">'+(isFav(idx)?'⭐ Favorito':'☆ Favorito')+'</button>';
  h+='<button onclick="toggleRead('+idx+')" style="border:1px solid var(--border)">'+(isRead(idx)?'✅ Leído':'📖 Marcar leído')+'</button>';
  h+='</div>';

  const note=state.notes[idx]||'';
  h+='<div style="margin-top:20px"><h3 style="font-size:0.95rem;margin-bottom:8px">📝 Mi Nota</h3>';
  h+='<textarea style="width:100%;min-height:80px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;color:var(--text)" placeholder="Escribe tu nota..." onblur="saveNote('+idx+',this.value)">'+esc(note)+'</textarea></div>';

  if(related.length>0){
    h+='<div class="related-section"><h3>📚 Otros en '+esc(sec.titulo)+'</h3><div class="books-grid">';
    related.forEach(r=>{h+=renderBookCard(r,LIBROS.indexOf(r))});
    h+='</div></div>';
  }
  if(sameCat.length>0){
    h+='<div class="related-section"><h3>🏷️ Más de '+esc(cat.nombre)+'</h3><div class="books-grid">';
    sameCat.slice(0,4).forEach(l=>{h+=renderBookCard(l,LIBROS.indexOf(l))});
    h+='</div></div>';
  }
  h+='</div>';return h;
}

function renderTechDetail(slug) {
  const t=TECHNOLOGIES.find(x=>x.slug===slug);
  if(!t) return'<p>No encontrada</p>';
  const catInfo=TECH_CATEGORIES[t.category]||{icon:'📦',color:'#6366f1'};
  const relatedBooks=LIBROS.filter(l=>(BOOK_TECH_MAP[l.seccion]||[]).includes(slug)).slice(0,6);

  let h='<div class="tech-detail">';
  h+='<button onclick="goBack()" style="margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">← Volver</button>';
  h+='<h2>'+catInfo.icon+' '+esc(t.title)+'</h2>';
  if(t.version&&t.version!=='-') h+='<p style="color:var(--text-secondary)">Versión: '+esc(t.version)+'</p>';
  h+='<div class="detail-meta"><span class="badge badge-tech">'+esc(t.categoryName)+'</span></div>';
  h+='<div class="tag-list" style="margin:12px 0">';
  t.tags.forEach(tag=>h+='<span class="tag">'+esc(tag)+'</span>');
  h+='</div>';

  h+='<div class="detail-actions">';
  h+='<button onclick="toggleTechFav(\''+t.slug+'\')" style="border:1px solid var(--border)">'+(isTechFav(t.slug)?'⭐ Favorito':'☆ Favorito')+'</button>';
  h+='</div>';

  // Render content sections
  // renderizar las SECCIONES del markdown como HTML
  h+='<div class="tech-content">';
  t.sections.forEach(s=>{
    h+='<h3>'+esc(s.title)+'</h3>';
    const lines=s.content.split('\n');
    const bt=String.fromCharCode(96); // backtick, el caracter ` usado en markdown para bloques de codigo
    lines.forEach(line=>{
      const trimmed=line.trimStart();
      if(trimmed.indexOf(bt+bt+bt)===0){h+='<pre><code>'}
      // si la linea empieza con ``` es un BLOQUE de codigo
      else if(line.startsWith('- ')) h+='<li>'+esc(line.substring(2))+'</li>';
      // si empieza con \"- \" es un ITEM de lista
      else if(line.startsWith('# ')){}
      // si empieza con \"# \" es un titulo H1, lo ignoramos porque ya tenemos el titulo del archivo
      else if(line.trim()) h+='<p>'+esc(line)+'</p>';
      // si no es nada de lo anterior, es un PARRAFO
    });
  });
  h+='</div>';

  if(relatedBooks.length>0){
    h+='<div class="related-section"><h3>📚 Libros relacionados</h3><div class="books-grid">';
    relatedBooks.forEach(b=>{h+=renderBookCard(b,LIBROS.indexOf(b))});
    h+='</div></div>';
  }
  h+='</div>';return h;
}

// ===== NAVIGATION =====
// Funciones de NAVEGACION, como cambiar de pestana, abrir/cerrar cosas

function switchTab(tab){
  state.tab=tab;state.view='list';
  // cambiar de pestana y volver a vista de lista
  state.categoryFilter=null;state.sectionFilter=null;state.formatFilter=null;state.techCategoryFilter=null;
  // LIMPIAR todos los filtros al cambiar de pestana
  state.selectedBook=null;state.selectedTech=null;
  render();renderSidebar();renderFilterPills();
}
function openBook(i){
  state.view='detail';state.selectedBook=i;state.tab='books';
  // abrir el DETALLE de un libro
  render();window.scrollTo(0,0);
  // renderizar y scrollear arriba para ver el detalle desde el inicio
}
function openTech(s){
  state.view='detail';state.selectedTech=s;state.tab='tech';
  render();window.scrollTo(0,0);
}
function goBack(){
  state.view='list';state.selectedBook=null;state.selectedTech=null;
  // volver a la LISTA desde el detalle
  render();renderSidebar();
}
function filterCat(id){
  state.categoryFilter=state.categoryFilter===id?null:id;
  // si ya estaba seleccionada, DESELECCIONARLA (toggle)
  state.sectionFilter=null;state.tab='books';state.view='list';
  render();renderSidebar();
}
function filterSec(id){
  state.sectionFilter=state.sectionFilter===id?null:id;
  if(state.sectionFilter) state.categoryFilter=seccionInfo(id).categoria;
  // si seleccionamos una seccion, tambien seleccionar su categoria padre
  state.tab='books';state.view='list';
  render();renderSidebar();
}
function filterFmt(f){
  state.formatFilter=state.formatFilter===f?null:f;
  render();renderFilterPills();
}
function filterTechCat(k){
  state.techCategoryFilter=state.techCategoryFilter===k?null:k;
  state.tab='tech';state.view='list';
  render();renderSidebar();
}
function setSort(s){
  state.sort=s;render();renderFilterPills();
}
function clearAll(){
  state.search='';state.categoryFilter=null;state.sectionFilter=null;state.formatFilter=null;state.techCategoryFilter=null;
  document.getElementById('searchInput').value='';
  // LIMPIAR todos los filtros y el campo de busqueda
  render();renderSidebar();renderFilterPills();
}
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}
// toggleSidebar = abrir/cerrar el sidebar en movil

function exportData(){
  const d={favorites:state.favorites,read:state.read,notes:state.notes,techFavorites:state.techFavorites};
  const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
  const u=URL.createObjectURL(b);
  const a=document.createElement('a');
  a.href=u;a.download='tech-library-backup.json';a.click();
  URL.revokeObjectURL(u);
  // exportData = descargar un BACKUP de tus favoritos, leidos y notas como archivo JSON
  // Blob = crear un archivo en memoria
  // URL.createObjectURL = crear una URL temporal para descargar
  // revokeObjectURL = liberar la memoria despues de descargar
}

function render(){
  const c=document.getElementById('content');
  let h='';
  if(state.view==='detail'&&state.selectedBook!==null) h=renderBookDetail(state.selectedBook);
  else if(state.view==='detail'&&state.selectedTech) h=renderTechDetail(state.selectedTech);
  else if(state.tab==='books') h=renderBooksView();
  else if(state.tab==='tech') h=renderTechView();
  else if(state.tab==='stats') h=renderStatsView();
  // DECIDIR que vista renderizar segun el estado actual
  c.innerHTML=h;
  // inyectar el HTML generado en el DOM
  const count=state.tab==='books'?getFilteredBooks().length:state.tab==='tech'?getFilteredTech().length:'-';
  document.getElementById('resultCount').textContent=count+(state.tab!=='stats'?' / '+(state.tab==='books'?LIBROS.length:TECHNOLOGIES.length):'');
  // actualizar el CONTADOR de resultados \"X / Y\"
}

// ===== EVENTS =====
// EVENTOS de teclado y busqueda

let searchTimeout;
document.getElementById('searchInput').addEventListener('input',e=>{
  clearTimeout(searchTimeout);
  searchTimeout=setTimeout(()=>{
    state.search=e.target.value;
    state.view='list';
    render();
  },200);
  // busqueda CON DEBOUNCE de 200ms, o sea si el usuario deja de escribir por 200ms se ejecuta la busqueda
  // asi no se busca en CADA tecla, sino cuando para de escribir
});

document.addEventListener('keydown',e=>{
  if((e.ctrlKey&&e.key==='k')||(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA')){
    e.preventDefault();
    document.getElementById('searchInput').focus();
    // Ctrl+K o / (fuera de inputs) = FOCO en la busqueda
  }
  if(e.key==='Escape'){
    document.getElementById('searchInput').blur();
    if(state.search) clearAll();
    // Escape = quitar foco de busqueda y LIMPIAR si hay busqueda activa
  }
  if(e.key==='1'&&!e.ctrlKey&&document.activeElement.tagName!=='INPUT') switchTab('books');
  if(e.key==='2'&&!e.ctrlKey&&document.activeElement.tagName!=='INPUT') switchTab('tech');
  // teclas 1 y 2 para cambiar de pestana RAPIDO
});

document.getElementById('overlay').addEventListener('click',toggleSidebar);
// clic en el overlay cierra el sidebar en movil

// ===== INIT =====
// ARRANCAR la aplicacion, como encender un computador
renderSidebar();renderFilterPills();render();
// dibujar sidebar, filtros y contenido inicial
</script>
</body>
</html>\`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
// writeFileSync = escribir el archivo COMPLETO de golpe, sin pausas
// genera el archivo index.html en la misma carpeta TECH-LIBRARY
console.log('Generated: tech-library/index.html');
console.log('Size:', (Buffer.byteLength(html)/1024).toFixed(1), 'KB');
console.log('Books:', LIBROS.length, '| Tech:', TECHNOLOGIES.length, '| Sections:', SECCIONES.length);
// imprime un RESUMEN de lo que genero: archivo, tamano en KB, y cantidades
// como un ticket de compra pero de generacion de archivos
