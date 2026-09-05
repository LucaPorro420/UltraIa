#!/usr/bin/env node
// ============================================================================
// FILE: generate.js
// WHAT IS THIS: ESTO ES UN GENERADOR DE UNA PAGINA WEB OFFLINE PARA LIBROS
//               osea este archivo LEE datos de JSON (como si fueran archivos de texto)
//               y los CONVIERTE en una paginita HTML autocontenida que puedes
//               abrir en tu navegador SIN internet. magia pura bro.
//
// WHO WROTE THIS: algun genio de UltraIa que quiso hacer una libreria tech offline
// WHY: porque a veces no tienes internet y quieres ver libros de tecnologia
//      tambien porque estaba aburrido supongo
//
// FUN FACT: este archivo tiene como 839 lineas... eso es MUCHO codigo para algo
//           que basicamente es "lee JSON y escribe HTML" lol
// ============================================================================

/**
 * Generador de TECH-LIBRARY — página offline interactiva.
 * Lee los JSON extraídos y produce un HTML autocontenido.
 *
 * // Literalmente esto dice "lee archivos JSON y genera un HTML que se carga solo"
 * // osea es como un empaquetador... toma datos sueltos y los mete en una cajita bonita
 * // que puedes abrir en chrome/firefox/edge/lo que tengas
 */
const fs = require('fs');
// // osea "const fs = require('fs')" esto es como importar el sistema de archivos
// // para que puedas leer y escribir archivos desde node.js
// // es como cuando abres el explorador de archivos pero desde el codigo
// // muy util para este tipo de automatizaciones

const path = require('path');
// // y "const path = require('path')" es para manejar rutas de archivos
// // como cuando buscas donde guardaste algo pero el codigo lo hace por ti
// // basicamente es el GPS del codigo, te dice donde estan las cosas

// ============================================================================
// DATA LOADING - Aqui es donde el mago saca los datos de los archivos JSON
// ============================================================================
// // ESTO ES LO PRIMERO QUE HACE: lee 3 archivos JSON y los convierte en objetos
// // es como si abrieras 3 cajas y sacaras todo lo que hay adentro

const LIBROS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'libros-data.json'), 'utf8'));
// // JSON.parse es como abrir un regalo que te envolvieron en JSON, lo desempaquetas
// // y ay? tiene datos adentro!! los libros vienen de libros-data.json que esta
// // un nivel arriba de donde estamos (por eso el '..')
// // fs.readFileSync lee el archivo SINCRONO (o sea espera a que termine antes de seguir)
// // path.join junta las partes de la ruta, como el GPS del codigo

const SECCIONES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secciones-data.json'), 'utf8'));
// // lo mismo pero con secciones, que son como las categorias grandes de los libros
// // por ejemplo "Programacion", "Diseño", "Redes", etc.

const CATEGORIAS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'categorias-data.json'), 'utf8'));
// // y adivina que? tambien leemos categorias! es como un sistema de carpetas
// // dentro de carpetas, organization porn lol

// ============================================================================
// LOOKUP MAPS - Construyendo un diccionario rapido para buscar cosas
// ============================================================================
// // Build lookup maps
// // ESTO es como crear un indice de un libro... para encontrar algo rapido
// // en vez de buscar en toda la lista, haces una tabla de referencia

const seccionMap = {};
// // aqui creamos un objeto vacio que sera nuestro "mapa" o "indice"
SECCIONES.forEach(s => { seccionMap[s.id] = s; });
// // y aqui metemos cada seccion en el mapa usando su ID como llave
// // osea si buscas seccionMap["abc123"] te da la seccion completa
// // es como un diccionario donde la palabra es el ID y la definicion es la seccion

// ============================================================================
// STATS COMPUTATION - Calculando estadisticas (lo mas nerd pero util)
// ============================================================================
// // Compute stats per category
// // Aqui calculamos cuantos libros hay en cada categoria
// // para poder mostrar graficas bonitas y saber que es lo mas popular

const statsByCategory = {};
// // otro objeto vacio para guardar las estadisticas por categoria
CATEGORIAS.forEach(c => {
  // // para cada categoria...
  const secs = SECCIONES.filter(s => s.categoria === c.id);
  // // filtramos las secciones que pertenecen a esta categoria
  // // osea "dame todas las secciones cuya categoria sea igual a este ID"
  // // es como el filtro de TikTok pero para datos de programacion
  const total = secs.reduce((acc, s) => acc + LIBROS.filter(l => l.seccion === s.id).length, 0);
  // // y aqui SUMAMOS todos los libros de todas esas secciones
  // // el reduce es como un acumulador... empieza en 0 y va sumando
  // // LIBROS.filter(l => l.seccion === s.id) encuentra los libros de cada seccion
  // // y .length nos dice cuantos hay
  statsByCategory[c.id] = { ...c, secciones: secs.length, total };
  // // guardamos el resultado con el spread operator (...) que es como copiar todo
  // // y le agregamos cuantas secciones tiene y cuantos libros en total
});

// // Compute stats per section
// // ahora hacemos lo mismo pero por seccion individual
const statsBySection = {};
SECCIONES.forEach(s => {
  statsBySection[s.id] = { ...s, total: LIBROS.filter(l => l.seccion === s.id).length };
  // // para cada seccion, contamos cuantos libros tiene y lo guardamos
  // // es como hacer un inventario de una tienda pero de secciones
});

// ============================================================================
// DATA OBJECT - Empaquetando todo en un solo objeto gigante
// ============================================================================
// // Aqui juntamos TODOS los datos en un solo objeto para pasarselo al HTML
// // es como hacer una maleta con todo lo que necesitas para el viaje

const DATA = {
  libros: LIBROS,       // // todos los libros
  secciones: SECCIONES, // // todas las secciones
  categorias: CATEGORIAS, // // todas las categorias
  statsByCategory,      // // estadisticas por categoria
  statsBySection        // // estadisticas por seccion
};

// ============================================================================
// HTML GENERATION - El corazon del generador, aqui es donde la magia pasa
// ============================================================================
// // ESTA ES LA PARTE GRANDE... el template HTML que se genera
// // es como un documento gigante con todo el HTML, CSS y JavaScript juntos
// // todo autocontenido, sin depender de nada externo

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tech Library — UltraIa</title>
<style>
/* ===== RESET & BASE ===== */
/* // ESTO es el "reset" basico... quita los estilos por defecto del navegador */
/* // como cuando quieres empezar un dibujo en papel blanco */
/* // el asterisco (*) significa "aplica esto a TODO" */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  /* // VARIABLES CSS!! esto es como crear constantes para colores y tamaños */
  /* // en vez de escribir "#08080a" mil veces, usas var(--canvas) */
  /* // es como tener un diccionario de colores para todo el sitio */
  --canvas:#08080a; /* // el color de fondo principal, bien oscuro como la noche */
  --panel:#111115;   /* // el color de los paneles, un poquito mas claro */
  --panel-hover:#16161c; /* // cuando pasas el mouse encima, cambia un pelin */
  --panel-active:#1c1c24; /* // cuando algo esta seleccionado */
  --border:#1f1f2a;  /* // el color de los bordes, sutil pero ahi esta */
  --border-subtle:#15151e; /* // bordes aun mas sutiles, casi invisibles */
  --text:#e4e4e7;     /* // el color del texto principal, blancito */
  --text-secondary:#a1a1aa; /* // texto secundario, un gris clarito */
  --text-muted:#52525b; /* // texto apagado, para cosas menos importantes */
  --primary:#8b5cf6;   /* // COLOR PRIMARIO!! morado vibrantee, el color main */
  --primary-dim:#7c3aed; /* // morado mas oscuro para hover */
  --primary-glow:rgba(139,92,246,0.15); /* // un brillo morado translucido */
  --success:#22c55e;   /* // verde para cosas exitosas */
  --warning:#f59e0b;   /* // amarillo para advertencias */
  --danger:#ef4444;    /* // rojo para errores o peligro */
  --accent-video:#ef4444; /* // acento para video (rojo) */
  --accent-audio:#3b82f6; /* // acento para audio (azul) */
  --accent-text:#22c55e;  /* // acento para texto (verde) */
  --accent-code:#f59e0b;  /* // acento para codigo (amarillo) */
  --accent-web:#8b5cf6;   /* // acento para web (morado) */
  --radius:8px;        /* // radio de bordes redondeados */
  --radius-sm:6px;     /* // bordes un poco menos redondeados */
  --radius-lg:12px;    /* // bordes mas redondeados */
  --shadow:0 4px 24px rgba(0,0,0,0.4); /* // sombra para tarjetas */
  --font-sans:'Inter',system-ui,-apple-system,sans-serif; /* // fuente principal */
  /* // Inter es una fuente muy moderna y limpia, perfecta para UI */
  --font-mono:'JetBrains Mono',ui-monospace,monospace; /* // fuente para codigo */
  /* // JetBrains Mono es la mejor fuente para ver codigo, no discuto */
}
/* // el HTML base: tamano de fuente 15px y scroll suave */
html{font-size:15px;scroll-behavior:smooth}
body{
  /* // el body: fuente Inter, fondo oscuro, texto blanco, altura minima 100vh */
  /* // 100vh significa "100% del viewport" o sea que llena toda la pantalla */
  font-family:var(--font-sans);background:var(--canvas);color:var(--text);
  min-height:100vh;line-height:1.6;
}
/* // links: color morado primario, sin subrayado por defecto */
a{color:var(--primary);text-decoration:none}
a:hover{text-decoration:underline} /* // al pasar el mouse, aparece el subrayado */
/* // botones: heredan la fuente, cursor pointer, sin borde ni fondo */
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
/* // inputs, textareas y selects: estilos basicos para formularios */
input,textarea,select{
  font-family:inherit;color:var(--text);background:var(--panel);
  border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;outline:none
}
/* // cuando enfocas un input, el borde se vuelve morado y hay un brillo */
input:focus,textarea:focus,select:focus{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-glow)}
/* // la seleccion de texto usa el color morado */
::selection{background:var(--primary);color:#fff}
/* // scrollbar personalizada para Chromium/Edge */
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* ===== LAYOUT ===== */
/* // El layout general: sidebar fijo a la izquierda, contenido principal a la derecha */
.app{display:flex;min-height:100vh}
.sidebar{
  /* // el sidebar: 280px de ancho, fijo en la izquierda */
  /* // es como el menu lateral de Spotify o YouTube */
  width:280px;min-width:280px;background:var(--panel);border-right:1px solid var(--border);
  display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:10;
  overflow-y:auto;
}
.sidebar-header{padding:20px;border-bottom:1px solid var(--border)}
.sidebar-header h1{font-size:1.1rem;font-weight:700;letter-spacing:-0.02em}
.sidebar-header .subtitle{font-size:0.75rem;color:var(--text-muted);margin-top:2px}
.sidebar-nav{flex:1;overflow-y:auto;padding:8px}
.nav-section{margin-bottom:4px}
.nav-section-title{
  /* // titulos de seccion en el sidebar: letras chicas, mayusculas, espaciadas */
  font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;
  color:var(--text-muted);padding:8px 12px 4px;font-weight:600;
}
.nav-item{
  /* // cada item del menu lateral: flex para alinear, hover suave */
  display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:var(--radius-sm);
  font-size:0.82rem;color:var(--text-secondary);transition:all 0.15s;cursor:pointer;
}
.nav-item:hover{background:var(--panel-hover);color:var(--text)}
.nav-item.active{background:var(--primary-glow);color:var(--primary);font-weight:500}
/* // cuando un item esta activo, se ilumina en morado */
.nav-item .count{
  /* // el contador de libros en cada seccion, a la derecha del item */
  margin-left:auto;font-size:0.7rem;background:var(--border);padding:1px 6px;
  border-radius:10px;color:var(--text-muted);
}
.nav-item.active .count{background:rgba(139,92,246,0.2);color:var(--primary)}
.sidebar-footer{padding:12px;border-top:1px solid var(--border);font-size:0.7rem;color:var(--text-muted);text-align:center}

.main{flex:1;margin-left:280px;display:flex;flex-direction:column;min-height:100vh}
/* // el contenido principal empieza despues del sidebar (280px) */
.topbar{
  /* // la barra superior: sticky para que se quede arriba al hacer scroll */
  /* // backdrop-filter: blur(12px) le da ese efecto de vidrio esmerilado */
  position:sticky;top:0;z-index:5;background:rgba(8,8,10,0.85);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);padding:12px 24px;
  display:flex;align-items:center;gap:12px;
}
.search-box{flex:1;position:relative}
.search-box input{
  /* // el input de busqueda: ocupa todo el ancho disponible, con icono a la izquierda */
  width:100%;padding:10px 16px 10px 40px;background:var(--panel);border:1px solid var(--border);
  border-radius:var(--radius);font-size:0.9rem;
}
.search-box .icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:1rem}
.filter-pills{display:flex;gap:6px;flex-wrap:wrap}
.pill{
  /* // los pills de filtro: como botones pequenos redondeados */
  /* // son como las etiquetas de Instagram pero para filtrar libros */
  padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:500;
  border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s;cursor:pointer;
  white-space:nowrap;
}
.pill:hover{border-color:var(--primary);color:var(--text)}
.pill.active{background:var(--primary);color:#fff;border-color:var(--primary)}
/* // pill activo: fondo morado, texto blanco */
.result-count{font-size:0.75rem;color:var(--text-muted);white-space:nowrap}
.content{flex:1;padding:24px}

/* ===== BOOK CARDS ===== */
/* // Las tarjetas de libros: grid responsive con tarjetas bonitas */
.books-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
/* // auto-fill significa que se adapta al ancho de la pantalla */
/* // minmax(320px,1fr) significa: cada tarjeta minimo 320px, maximo lo que se pueda */
.book-card{
  /* // cada tarjeta de libro: fondo oscuro, bordes redondeados, sombra sutil */
  background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:20px;transition:all 0.2s;position:relative;display:flex;flex-direction:column;
}
.book-card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:var(--shadow)}
/* // HOVER MAGIC: al pasar el mouse, la tarjeta sube 2px y aparece sombra */
/* // es como si la tarjeta "levantara" un poco, muy satisfactorio */
.book-card .card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.book-card .card-title{font-size:0.95rem;font-weight:600;line-height:1.4;flex:1}
.book-card .card-author{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
.book-card .card-meta{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center}
.badge{
  /* // los badges: como etiquetas pequenas de colores */
  /* // son como los tags de GitHub pero para formatos y categorias */
  display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;
  font-size:0.7rem;font-weight:500;
}
.badge-format{background:rgba(139,92,246,0.12);color:var(--primary)} /* // badge de formato: morado */
.badge-section{background:rgba(34,197,94,0.1);color:var(--success)}   /* // badge de seccion: verde */
.badge-category{background:rgba(245,158,11,0.1);color:var(--warning)} /* // badge de categoria: amarillo */
.book-card .card-actions{
  /* // botones de accion de cada tarjeta: favorito, leer, notas */
  display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);
}
.book-card .card-actions button{
  padding:6px 12px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;
  border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s;
}
.book-card .card-actions button:hover{border-color:var(--primary);color:var(--text)}
.book-card .card-actions .btn-fav.active{background:rgba(245,158,11,0.15);color:var(--warning);border-color:var(--warning)}
/* // boton de favorito activo: amarillo brillante */
.book-card .card-actions .btn-read.active{background:rgba(34,197,94,0.15);color:var(--success);border-color:var(--success)}
/* // boton de leido activo: verde */
.book-card .card-actions .btn-notes{margin-left:auto} /* // notas siempre a la derecha */
.book-card .card-notes{
  /* // area de notas: se oculta por defecto y aparece al hacer clic */
  margin-top:8px;padding:8px 12px;background:var(--canvas);border-radius:var(--radius-sm);
  font-size:0.78rem;color:var(--text-secondary);border:1px solid var(--border-subtle);
  display:none; /* // oculto por defecto */
}
.book-card .card-notes.visible{display:block} /* // se muestra cuando tiene la clase 'visible' */
.book-card .card-notes textarea{
  width:100%;min-height:60px;background:transparent;border:none;color:var(--text);
  font-size:0.78rem;resize:vertical;padding:0;
}
.book-card .related{margin-top:10px;font-size:0.72rem;color:var(--text-muted)}
.book-card .related a{font-size:0.72rem;margin-right:8px}

/* ===== VIEWS ===== */
/* // Las diferentes vistas de la app: home, favoritos, leyendo, estadisticas, detalle */
.view{display:none} /* // por defecto todas ocultas */
.view.active{display:block} /* // solo la activa se muestra */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat-card{
  background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:20px;text-align:center;
}
.stat-card .stat-value{font-size:2rem;font-weight:700;color:var(--primary)}
.stat-card .stat-label{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
.book-detail{max-width:700px;margin:0 auto}
.book-detail h2{font-size:1.5rem;font-weight:700;margin-bottom:8px}
.book-detail .detail-meta{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
.book-detail .detail-desc{color:var(--text-secondary);margin:16px 0;line-height:1.7}
.book-detail .detail-actions{display:flex;gap:8px;margin:20px 0}
.book-detail .detail-actions a,.book-detail .detail-actions button{
  padding:10px 20px;border-radius:var(--radius);font-weight:500;font-size:0.85rem;
  border:1px solid var(--border);transition:all 0.15s;
}
.book-detail .detail-actions .btn-primary{background:var(--primary);color:#fff;border-color:var(--primary)}
.book-detail .detail-actions .btn-primary:hover{background:var(--primary-dim)}
.book-detail .related-section{margin-top:32px;padding-top:20px;border-top:1px solid var(--border)}
.book-detail .related-section h3{font-size:1rem;font-weight:600;margin-bottom:12px}

/* ===== FAVORITES VIEW ===== */
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}
.empty-state .icon{font-size:3rem;margin-bottom:12px}
.empty-state p{font-size:0.9rem}

/* ===== MOBILE ===== */
/* // Responsive design!! esto hace que se vea bien en celulares */
/* // cuando la pantalla es menor a 768px (como un celular) */
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);transition:transform 0.3s}
  /* // el sidebar se esconde a la izquierda y se muestra con animacion */
  .sidebar.open{transform:translateX(0)} /* // cuando tiene la clase 'open', aparece */
  .main{margin-left:0} /* // el contenido principal ocupa todo el ancho */
  .topbar{padding:12px 16px}
  .books-grid{grid-template-columns:1fr} /* // las tarjetas se apilan en 1 columna */
  .mobile-toggle{display:flex!important} /* // el boton de menu hamburguesa aparece */
}
.mobile-toggle{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--radius-sm);border:1px solid var(--border)}
/* // el overlay oscuro cuando el sidebar esta abierto en movil */
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9}
.overlay.visible{display:block}

/* ===== KEYBOARD SHORTCUTS HINT ===== */
/* // la ayudadita de atajos de teclado en la esquina inferior derecha */
.shortcuts-hint{
  position:fixed;bottom:16px;right:16px;background:var(--panel);border:1px solid var(--border);
  border-radius:var(--radius);padding:8px 14px;font-size:0.7rem;color:var(--text-muted);
  z-index:20;display:flex;gap:12px;
}
kbd{
  /* // las teclas se ven como teclas reales con este estilo */
  display:inline-block;padding:1px 5px;background:var(--canvas);border:1px solid var(--border);
  border-radius:3px;font-family:var(--font-mono);font-size:0.65rem;
}
</style>
</head>
<body>
<div class="app">
  <!-- SIDEBAR -->
  <!-- // EL MENU LATERAL - como el menu de Instagram pero para libros -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>📚 Tech Library</h1>
      <!-- // el titulo con emoji de libros, muy aesthetic -->
      <div class="subtitle">115 libros · 32 secciones · 8 categorías</div>
      <!-- // estadisticas rapidas: cuantos libros, secciones y categorias hay -->
    </div>
    <nav class="sidebar-nav" id="sidebarNav"></nav>
    <!-- // la navegacion se llena dinamicamente con JavaScript -->
    <div class="sidebar-footer">UltraIa · Offline · Sin conexión</div>
    <!-- // footer que dice que es offline, para que sepas que no necesitas internet -->
  </aside>

  <!-- OVERLAY (mobile) -->
  <!-- // overlay oscuro que aparece cuando abres el sidebar en movil -->
  <div class="overlay" id="overlay"></div>

  <!-- MAIN -->
  <div class="main">
    <div class="topbar">
      <!-- // boton hamburguesa para movil, oculto en desktop -->
      <button class="mobile-toggle" id="mobileToggle" onclick="toggleSidebar()">☰</button>
      <div class="search-box">
        <span class="icon">🔍</span>
        <!-- // icono de busqueda, muy estetico -->
        <input type="text" id="searchInput" placeholder="Buscar por título, autor, sección... (Ctrl+K)" autocomplete="off">
        <!-- // input de busqueda con placeholder que indica los atajos -->
      </div>
      <div class="filter-pills" id="filterPills"></div>
      <!-- // los pills de filtro se generan dinamicamente -->
      <span class="result-count" id="resultCount"></span>
      <!-- // contador de resultados: "42 / 115" -->
    </div>
    <div class="content" id="content"></div>
    <!-- // AQUI es donde se renderiza todo el contenido dinamicamente -->
  </div>

  <!-- SHORTCUTS -->
  <!-- // la ayudadita de atajos de teclado, siempre visible en la esquina -->
  <div class="shortcuts-hint">
    <span><kbd>/</kbd> Buscar</span>
    <span><kbd>Esc</kbd> Limpiar</span>
    <span><kbd>←→</kbd> Navegar</span>
  </div>
</div>

<script>
// ============================================================================
// JAVASCRIPT - La logica de la aplicacion
// ============================================================================

// ===== DATA =====
// // Los datos se inyectan directamente en el HTML generado
// // es como si el generador pegara los JSON aqui adentro
// // asi la pagina no necesita cargar archivos externos
const LIBROS = ${JSON.stringify(LIBROS)};
const SECCIONES = ${JSON.stringify(SECCIONES)};
const CATEGORIAS = ${JSON.stringify(CATEGORIAS)};
// // JSON.stringify convierte los objetos JavaScript a texto JSON
// // es como empacar las maletas para que viajen dentro del HTML

// ===== STATE =====
// // EL ESTADO DE LA APLICACION - como la memoria de la app
// // guarda todo lo que esta pasando: que vista estas viendo, que buscaste, etc.
let state = {
  view: 'home',           // // que vista esta activa: home, favorites, reading, stats, detail
  search: '',             // // el texto de busqueda actual
  categoryFilter: null,   // // filtro de categoria activo (null = ninguno)
  sectionFilter: null,    // // filtro de seccion activo
  formatFilter: null,     // // filtro de formato (PDF, HTML, eBook, etc.)
  favorites: JSON.parse(localStorage.getItem('tl_favorites') || '[]'),
  // // favoritos: se guardan en localStorage para que persistan entre sesiones
  // // o sea si cierras el navegador y vuelves, tus favoritos siguen ahi
  // // JSON.parse convierte el texto de vuelta a un array
  // // localStorage es como un mini disco duro en el navegador
  read: JSON.parse(localStorage.getItem('tl_read') || '[]'),
  // // libros marcados como leidos, igual que favoritos
  notes: JSON.parse(localStorage.getItem('tl_notes') || '{}'),
  // // notas personales por libro, guardadas en localStorage
  selectedBook: null,     // // el libro seleccionado para ver detalle
  sort: 'title'           // // orden: title | author | section
};

function saveState() {
  // // GUARDAR ESTADO - guarda todo en localStorage
  // // es como hacer backup de tu progreso en un juego
  localStorage.setItem('tl_favorites', JSON.stringify(state.favorites));
  localStorage.setItem('tl_read', JSON.stringify(state.read));
  localStorage.setItem('tl_notes', JSON.stringify(state.notes));
}

// ============================================================================
// HELPERS - Funciones de ayuda que simplifican tareas comunes
// ============================================================================
// ===== HELPERS =====

function quitarAcentos(s) {
  // // QUITAR ACENTOS - esta funcion es BRILLANTE
  // // convierte "Programación" a "programacion" para que la busqueda funcione
  // // aunque el usuario no ponga tildes
  // // normalize('NFD') separa los acentos de las letras
  // // y el regex los elimina, quedando solo la letra base
  return s.normalize('NFD').replace(/\\p{Diacritic}/gu, '').toLowerCase();
}

function seccionInfo(id) {
  // // BUSCAR INFORMACION DE SECCION - como un buscador de Wikipedia
  // // si encuentra la seccion, devuelve toda su info
  // // si no la encuentra, devuelve un objeto vacio con valores por defecto
  return SECCIONES.find(s => s.id === id) || { titulo: id, descripcion: '', categoria: '' };
  // // el find() busca el primer elemento que cumpla la condicion
  // // el || es un fallback: si no encuentra nada, usa el objeto por defecto
}

function categoriaInfo(id) {
  // // igual que seccionInfo pero para categorias
  return CATEGORIAS.find(c => c.id === id) || { nombre: id };
}

function librosPorSeccion(seccionId) {
  // // FILTRAR LIBROS POR SECCION - como buscar libros en una estanteria
  // // te da todos los libros que pertenecen a una seccion especifica
  return LIBROS.filter(l => l.seccion === seccionId);
  // // filter() es como un colador: solo deja pasar los que cumplen la condicion
}

function countByCategory(catId) {
  // // CONTAR LIBROS POR CATEGORIA - hacer inventario
  // // primero encuentra todas las secciones de esa categoria
  const secs = SECCIONES.filter(s => s.categoria === catId);
  // // luego suma todos los libros de esas secciones
  return secs.reduce((acc, s) => acc + LIBROS.filter(l => l.seccion === s.id).length, 0);
  // // reduce() es como una calculadora que va acumulando
}

function countBySection(secId) {
  // // contar libros en una seccion especifica, mas simple
  return LIBROS.filter(l => l.seccion === secId).length;
}

function isFav(idx) { return state.favorites.includes(idx); }
// // esta funcion dice "hey, este libro esta en mi lista de favoritos?"
// // includes() devuelve true o false

function isRead(idx) { return state.read.includes(idx); }
// // igual pero para libros leidos

function toggleFav(idx, e) {
  // // TOGGLE FAVORITO - encender/apagar el favorito
  // // si ya es favorito, lo quita; si no lo es, lo agrega
  // // es como el boton de "me gusta" de Instagram
  e && e.stopPropagation(); // // detiene la propagacion del evento (para que no se abra el libro)
  const i = state.favorites.indexOf(idx); // // busca la posicion del libro en favoritos
  if (i >= 0) state.favorites.splice(i, 1); // // si esta, lo elimina (splice borra 1 elemento en la posicion i)
  else state.favorites.push(idx); // // si no esta, lo agrega al final
  saveState(); renderCurrentView(); // // guarda y re-renderiza
}

function toggleRead(idx, e) {
  // // TOGGLE LEIDO - igual que toggleFav pero para marcar como leido
  e && e.stopPropagation();
  const i = state.read.indexOf(idx);
  if (i >= 0) state.read.splice(i, 1); else state.read.push(idx);
  saveState(); renderCurrentView();
}

function toggleNotes(idx, e) {
  // // TOGGLE NOTAS - muestra/oculta el area de notas de un libro
  e && e.stopPropagation();
  const card = document.querySelector('[data-book-idx="' + idx + '"] .card-notes');
  // // busca el elemento de notas usando un selector CSS con el data attribute
  if (card) card.classList.toggle('visible');
  // // toggle: si tiene 'visible' lo quita, si no lo tiene lo agrega
}

function saveNote(idx, text) {
  // // GUARDAR NOTA - guarda el texto de la nota en el estado
  state.notes[idx] = text; // // la nota se guarda usando el indice del libro como llave
  saveState(); // // y se persiste en localStorage
}

// ============================================================================
// SEARCH & FILTER - El motor de busqueda y filtros
// ============================================================================

// ===== SEARCH & FILTER =====
function getFilteredBooks() {
  // // GET BOOKS FILTRADOS - la funcion MAs importante de la app
  // // toma TODOS los libros y les aplica todos los filtros activos
  // // es como un procesador de agua: entra sucio, sale limpio y filtrado
  let books = LIBROS.map((b, i) => ({ ...b, _idx: i }));
  // // primero copiamos todos los libros y les agregamos su indice original
  // // el _idx es para poder rastrear cual libro es cual despues de filtrar

  // Search
  if (state.search) {
    // // si hay algo escrito en la busqueda...
    const terms = quitarAcentos(state.search).split(/\\s+/).filter(Boolean);
    // // dividimos el texto de busqueda en palabras individuales
    // // quitarAcentos para buscar sin tildes
    // // split(/\\s+/) separa por espacios (uno o mas)
    // // filter(Boolean) quita strings vacios
    books = books.filter(b => {
      const titulo = quitarAcentos(b.titulo);
      const autor = b.autor ? quitarAcentos(b.autor) : '';
      const sec = quitarAcentos(seccionInfo(b.seccion).titulo);
      return terms.every(t => titulo.includes(t) || autor.includes(t) || sec.includes(t));
      // // every() significa: TODAS las palabras deben encontrar algo
      // // busca en titulo, autor O seccion
      // // es como buscar en Google pero en tu propia libreria
    });
  }

  // Category filter
  if (state.categoryFilter) {
    // // si hay filtro de categoria activo...
    const secIds = SECCIONES.filter(s => s.categoria === state.categoryFilter).map(s => s.id);
    // // encuentra todas las secciones de esa categoria
    books = books.filter(b => secIds.includes(b.seccion));
    // // y filtra los libros que estan en esas secciones
  }

  // Section filter
  if (state.sectionFilter) {
    books = books.filter(b => b.seccion === state.sectionFilter);
    // // filtro por seccion especifica, mas directo
  }

  // Format filter
  if (state.formatFilter) {
    if (state.formatFilter === 'none') {
      books = books.filter(b => !b.formato);
      // // si el filtro es 'none', muestra libros SIN formato definido
    } else {
      books = books.filter(b => b.formato && quitarAcentos(b.formato).includes(quitarAcentos(state.formatFilter)));
      // // busca libros cuyo formato contenga el filtro seleccionado
    }
  }

  // Sort
  books.sort((a, b) => {
    if (state.sort === 'author') return (a.autor || 'zzz').localeCompare(b.autor || 'zzz', 'es');
    // // ordenar por autor: localeCompare compara strings en español
    // // si no hay autor, usa 'zzz' para que quede al final
    if (state.sort === 'section') return a.seccion.localeCompare(b.seccion) || a.titulo.localeCompare(b.titulo, 'es');
    // // ordenar por seccion, y dentro de la misma seccion por titulo
    return a.titulo.localeCompare(b.titulo, 'es');
    // // por defecto: orden alfabetico por titulo
  });

  return books;
}

// ============================================================================
// RENDER SIDEBAR - Dibujar el menu lateral
// ============================================================================

// ===== RENDER SIDEBAR =====
function renderSidebar() {
  // // RENDER SIDEBAR - dibuja todo el menu lateral dinamicamente
  const nav = document.getElementById('sidebarNav');
  // // busca el elemento nav en el DOM
  let html = ''; // // variable para ir construyendo el HTML

  // Home
  // // primero los items principales: Inicio, Favoritos, Leyendo, Estadisticas
  html += '<div class="nav-section">';
  html += '<div class="nav-item' + (state.view === 'home' ? ' active' : '') + '" onclick="navigate(\'home\')">';
  html += '🏠 <span>Inicio</span><span class="count">' + LIBROS.length + '</span></div>';
  // // Inicio: muestra todos los libros con un emoji de casa
  html += '<div class="nav-item' + (state.view === 'favorites' ? ' active' : '') + '" onclick="navigate(\'favorites\')">';
  html += '⭐ <span>Favoritos</span><span class="count">' + state.favorites.length + '</span></div>';
  // // Favoritos: estrella dorada, cuenta cuantos tienes
  html += '<div class="nav-item' + (state.view === 'reading' ? ' active' : '') + '" onclick="navigate(\'reading\')">';
  html += '📖 <span>Leyendo</span><span class="count">' + state.read.length + '</span></div>';
  // // Leyendo: icono de libro abierto
  html += '<div class="nav-item' + (state.view === 'stats' ? ' active' : '') + '" onclick="navigate(\'stats\')">';
  html += '📊 <span>Estadísticas</span></div>';
  // // Estadisticas: grafica, sin contador
  html += '</div>';

  // Categories
  // // ahora las categorias: cada una con su contador
  html += '<div class="nav-section"><div class="nav-section-title">Categorías</div>';
  CATEGORIAS.forEach(cat => {
    const count = countByCategory(cat.id);
    const isActive = state.categoryFilter === cat.id && state.view === 'home';
    html += '<div class="nav-item' + (isActive ? ' active' : '') + '" onclick="filterCategory(\'' + cat.id + '\')">';
    html += '<span>' + cat.nombre + '</span><span class="count">' + count + '</span></div>';
    // // cada categoria es clickeable y muestra cuantos libros tiene
  });
  html += '</div>';

  // Sections (when category selected)
  // // si hay una categoria seleccionada, mostramos sus secciones
  if (state.categoryFilter) {
    const secs = SECCIONES.filter(s => s.categoria === state.categoryFilter);
    html += '<div class="nav-section"><div class="nav-section-title">Secciones</div>';
    secs.forEach(s => {
      const count = countBySection(s.id);
      const isActive = state.sectionFilter === s.id;
      html += '<div class="nav-item' + (isActive ? ' active' : '') + '" onclick="filterSection(\'' + s.id + '\')">';
      html += '<span>' + s.titulo + '</span><span class="count">' + count + '</span></div>';
    });
    html += '</div>';
  }

  nav.innerHTML = html; // // inyecta todo el HTML generado en el DOM
}

// ============================================================================
// RENDER FILTER PILLS - Los botoncitos de filtro
// ============================================================================

// ===== RENDER FILTER PILLS =====
function renderFilterPills() {
  // // RENDER FILTER PILLS - dibuja los botones de filtro en la barra superior
  const container = document.getElementById('filterPills');
  let html = '';

  // Format pills
  // // los formatos disponibles: PDF, HTML, eBook, y "sin formato"
  const formats = ['PDF', 'HTML', 'eBook', 'none'];
  const formatLabels = { 'PDF': '📄 PDF', 'HTML': '🌐 HTML', 'eBook': '📱 eBook', 'none': '❓ Sin formato' };
  // // cada formato tiene su emoji y label bonito
  formats.forEach(f => {
    const isActive = state.formatFilter === f;
    html += '<button class="pill' + (isActive ? ' active' : '') + '" onclick="filterFormat(\'' + f + '\')">' + formatLabels[f] + '</button>';
  });

  // Sort pills
  // // los botones de ordenamiento: A-Z, Autor, Seccion
  html += '<button class="pill' + (state.sort === 'title' ? ' active' : '') + '" onclick="setSort(\'title\')">A-Z</button>';
  html += '<button class="pill' + (state.sort === 'author' ? ' active' : '') + '" onclick="setSort(\'author\')">Autor</button>';
  html += '<button class="pill' + (state.sort === 'section' ? ' active' : '') + '" onclick="setSort(\'section\')">Sección</button>';

  container.innerHTML = html;
}

// ============================================================================
// RENDER BOOK CARD - Crear la tarjeta de cada libro
// ============================================================================

// ===== RENDER BOOK CARD =====
function renderBookCard(book, idx) {
  // // RENDER BOOK CARD - crea el HTML de UNA tarjeta de libro
  // // esta funcion se llama para cada libro que se muestra
  // // es como una fabrica de tarjetas: entra un libro, sale HTML
  const sec = seccionInfo(book.seccion); // // busca info de la seccion
  const cat = categoriaInfo(sec.categoria); // // y de la categoria
  const related = librosPorSeccion(book.seccion).filter((_, i) => LIBROS.indexOf(librosPorSeccion(book.seccion)[i]) !== idx).slice(0, 3);
  // // busca libros relacionados: los de la misma seccion pero NO este libro
  // // y muestra solo los primeros 3
  const note = state.notes[idx] || ''; // // la nota del usuario para este libro

  let html = '<div class="book-card" data-book-idx="' + idx + '" onclick="openBook(' + idx + ')">';
  // // la tarjeta: tiene un data attribute con el indice y un onclick para abrir detalle
  html += '<div class="card-header"><div class="card-title">' + escHtml(book.titulo) + '</div></div>';
  // // titulo del libro, escapado para prevenir XSS
  if (book.autor) html += '<div class="card-author">' + escHtml(book.autor) + '</div>';
  // // autor si existe
  html += '<div class="card-meta">';
  if (book.formato) html += '<span class="badge badge-format">' + escHtml(book.formato) + '</span>';
  // // badge de formato (PDF, HTML, etc.)
  html += '<span class="badge badge-section">' + escHtml(sec.titulo) + '</span>';
  // // badge de seccion
  html += '<span class="badge badge-category">' + escHtml(cat.nombre) + '</span>';
  // // badge de categoria
  html += '</div>';

  // Actions
  // // los botones de accion: favorito, leer, notas
  html += '<div class="card-actions">';
  html += '<button class="btn-fav' + (isFav(idx) ? ' active' : '') + '" onclick="toggleFav(' + idx + ',event)" title="Favorito">' + (isFav(idx) ? '⭐' : '☆') + ' Fav</button>';
  // // boton de favorito: estrella llena si es fav, vacia si no
  html += '<button class="btn-read' + (isRead(idx) ? ' active' : '') + '" onclick="toggleRead(' + idx + ',event)" title="Marcar leído">' + (isRead(idx) ? '✅' : '📖') + ' Leer</button>';
  // // boton de leido: check si esta leido, libro si no
  html += '<button class="btn-notes" onclick="toggleNotes(' + idx + ',event)" title="Notas">📝 Notas</button>';
  // // boton de notas: siempre visible
  html += '</div>';

  // Notes
  // // area de notas, oculta por defecto
  html += '<div class="card-notes' + (note ? ' visible' : '') + '">';
  html += '<textarea placeholder="Escribe una nota..." onclick="event.stopPropagation()" onblur="saveNote(' + idx + ',this.value)">' + escHtml(note) + '</textarea>';
  // // textarea para escribir notas
  // // onclick stopPropagation: para que al hacer clic no se abra el detalle del libro
  // // onblur saveNote: cuando haces clic fuera, se guarda la nota
  html += '</div>';

  // Related
  // // libros relacionados, si hay
  if (related.length > 0) {
    html += '<div class="related">📚 Relacionados: ';
    related.forEach(r => {
      const rIdx = LIBROS.indexOf(r);
      html += '<a href="javascript:void(0)" onclick="openBook(' + rIdx + ');event.stopPropagation()">' + escHtml(r.titulo.substring(0, 30)) + (r.titulo.length > 30 ? '...' : '') + '</a>';
      // // muestra el titulo truncado a 30 caracteres con "..." si es largo
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function escHtml(s) {
  // // ESCAPAR HTML - funcion de seguridad MUY importante
  // // reemplaza caracteres especiales para que no se rompa el HTML
  // // y para prevenir ataques XSS (inyeccion de codigo malicioso)
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // // & -> &amp;  < -> &lt;  > -> &gt;  " -> &quot;
  // // asi si alguien pone "<script>alert('hack')</script>" en un titulo,
  // // se muestra como texto plano y no se ejecuta como codigo
}

// ============================================================================
// RENDER VIEWS - Las diferentes pantallas de la aplicacion
// ============================================================================

// ===== RENDER VIEWS =====
function renderHome() {
  // // RENDER HOME - la pantalla principal
  // // muestra todos los libros con sus filtros aplicados
  const books = getFilteredBooks();
  let html = '';

  // Hero stats
  // // si no hay filtros activos, mostramos las estadisticas hero
  if (!state.search && !state.categoryFilter && !state.sectionFilter && !state.formatFilter) {
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + LIBROS.length + '</div><div class="stat-label">Libros</div></div>';
    // // total de libros
    html += '<div class="stat-card"><div class="stat-value">' + SECCIONES.length + '</div><div class="stat-label">Secciones</div></div>';
    // // total de secciones
    html += '<div class="stat-card"><div class="stat-value">' + CATEGORIAS.length + '</div><div class="stat-label">Categorías</div></div>';
    // // total de categorias
    html += '<div class="stat-card"><div class="stat-value">' + state.favorites.length + '</div><div class="stat-label">Favoritos</div></div>';
    // // total de favoritos
    html += '</div>';
  }

  // Book grid
  // // la cuadricula de libros
  html += '<div class="books-grid">';
  if (books.length === 0) {
    html += '<div class="empty-state"><div class="icon">📭</div><p>No se encontraron libros con esos filtros.</p></div>';
    // // estado vacio cuando no hay resultados: buzon triste
  } else {
    books.forEach(b => { html += renderBookCard(b, b._idx); });
    // // renderiza cada libro como una tarjeta
  }
  html += '</div>';

  return html;
}

function renderFavorites() {
  // // RENDER FAVORITOS - muestra solo los libros marcados como favoritos
  const books = state.favorites.map(i => ({ ...LIBROS[i], _idx: i }));
  // // convierte los indices de favoritos en objetos de libro completos
  let html = '<h2 style="margin-bottom:16px">⭐ Mis Favoritos</h2>';
  if (books.length === 0) {
    html += '<div class="empty-state"><div class="icon">⭐</div><p>No tienes favoritos aún. Haz clic en ☆ en cualquier libro.</p></div>';
    // // si no hay favoritos, muestra un mensaje amigable
  } else {
    html += '<div class="books-grid">';
    books.forEach(b => { html += renderBookCard(b, b._idx); });
    html += '</div>';
  }
  return html;
}

function renderReading() {
  // // RENDER LEYENDO - muestra libros marcados como leidos
  const books = state.read.map(i => ({ ...LIBROS[i], _idx: i }));
  let html = '<h2 style="margin-bottom:16px">📖 Libros Leídos</h2>';
  if (books.length === 0) {
    html += '<div class="empty-state"><div class="icon">📖</div><p>No has marcado ningún libro como leído.</p></div>';
  } else {
    html += '<div class="books-grid">';
    books.forEach(b => { html += renderBookCard(b, b._idx); });
    html += '</div>';
  }
  return html;
}

function renderStats() {
  // // RENDER ESTADISTICAS - la pantalla mas nerd pero satisfactoria
  // // muestra graficas y numeros de toda la coleccion
  let html = '<h2 style="margin-bottom:20px">📊 Estadísticas</h2>';

  // Category breakdown
  // // breakdown por categoria: cuantos libros en cada una
  html += '<h3 style="margin:16px 0 12px;color:var(--text-secondary)">Por Categoría</h3>';
  html += '<div class="stats-grid">';
  CATEGORIAS.forEach(cat => {
    const total = countByCategory(cat.id);
    const pct = Math.round((total / LIBROS.length) * 100);
    // // calcula el porcentaje de libros que representa esta categoria
    html += '<div class="stat-card" style="cursor:pointer" onclick="filterCategory(\'' + cat.id + '\')">';
    // // las tarjetas de estadistica son clickeables: filtran por esa categoria
    html += '<div class="stat-value">' + total + '</div>';
    html += '<div class="stat-label">' + cat.nombre + ' (' + pct + '%)</div>';
    html += '</div>';
  });
  html += '</div>';

  // Format breakdown
  // // breakdown por formato: PDF, HTML, eBook, etc.
  const formatCounts = {};
  LIBROS.forEach(b => {
    const f = b.formato || 'Sin formato';
    formatCounts[f] = (formatCounts[f] || 0) + 1;
    // // cuenta cuantos libros hay de cada formato
  });
  html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Por Formato</h3>';
  html += '<div class="stats-grid">';
  Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).forEach(([fmt, count]) => {
    // // Object.entries convierte el objeto a un array de pares [llave, valor]
    // // sort ordena de mayor a menor cantidad
    const pct = Math.round((count / LIBROS.length) * 100);
    html += '<div class="stat-card"><div class="stat-value">' + count + '</div>';
    html += '<div class="stat-label">' + escHtml(fmt) + ' (' + pct + '%)</div></div>';
  });
  html += '</div>';

  // Section breakdown
  // // breakdown por seccion con barras de progreso visuales
  html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Por Sección</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">';
  SECCIONES.forEach(s => {
    const count = countBySection(s.id);
    const pct = Math.round((count / LIBROS.length) * 100);
    const barW = Math.max(4, pct * 2); // // ancho de la barra, minimo 4px
    // // cada seccion tiene una barra de progreso que crece segun la cantidad de libros
    html += '<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer" onclick="filterSection(\'' + s.id + '\')">';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px">';
    html += '<span>' + escHtml(s.titulo) + '</span><span style="color:var(--text-muted)">' + count + '</span></div>';
    html += '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">';
    html += '<div style="height:100%;width:' + barW + '%;background:var(--primary);border-radius:2px;transition:width 0.3s"></div></div></div>';
    // // la barra: fondo gris con un relleno morado que crece con transicion suave
  });
  html += '</div>';

  // User stats
  // // estadisticas personales del usuario: cuantos ha leido, favoritos, notas
  html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Mi Progreso</h3>';
  html += '<div class="stats-grid">';
  html += '<div class="stat-card"><div class="stat-value">' + state.read.length + '</div><div class="stat-label">Leídos</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + state.favorites.length + '</div><div class="stat-label">Favoritos</div></div>';
  const notesCount = Object.keys(state.notes).filter(k => state.notes[k].trim()).length;
  // // Object.keys obtiene todas las llaves del objeto notes
  // // filter verifica que la nota no este vacia (trim quita espacios)
  html += '<div class="stat-card"><div class="stat-value">' + notesCount + '</div><div class="stat-label">Con Notas</div></div>';
  html += '</div>';

  return html;
}

function renderBookDetail(idx) {
  // // RENDER BOOK DETAIL - la vista de detalle de un libro
  // // cuando haces clic en una tarjeta, esta funcion genera la pagina completa
  const book = LIBROS[idx];
  const sec = seccionInfo(book.seccion);
  const cat = categoriaInfo(sec.categoria);
  const related = librosPorSeccion(book.seccion).filter((_, i) => {
    const realIdx = LIBROS.indexOf(librosPorSeccion(book.seccion)[i]);
    return realIdx !== idx;
  });
  // // libros de la misma seccion pero excluyendo este
  const sameCat = LIBROS.filter((b, i) => {
    const s = seccionInfo(b.seccion);
    return s.categoria === sec.categoria && b.seccion !== book.seccion;
  }).slice(0, 6);
  // // libros de la misma categoria pero diferentes secciones, maximo 6

  let html = '<div class="book-detail">';
  html += '<button onclick="goBack()" style="margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">← Volver</button>';
  // // boton para volver a la vista anterior
  html += '<h2>' + escHtml(book.titulo) + '</h2>';
  if (book.autor) html += '<p style="color:var(--text-secondary);font-size:0.9rem">por ' + escHtml(book.autor) + '</p>';
  // // titulo y autor del libro

  html += '<div class="detail-meta">';
  if (book.formato) html += '<span class="badge badge-format">' + escHtml(book.formato) + '</span>';
  html += '<span class="badge badge-section">' + escHtml(sec.titulo) + '</span>';
  html += '<span class="badge badge-category">' + escHtml(cat.nombre) + '</span>';
  html += '</div>';
  // // badges de formato, seccion y categoria

  html += '<p class="detail-desc">' + escHtml(sec.descripcion) + '</p>';
  // // descripcion de la seccion (contexto del libro)

  html += '<div class="detail-actions">';
  html += '<a href="' + escHtml(book.url) + '" target="_blank" rel="noopener" class="btn-primary">🔗 Abrir recurso</a>';
  // // boton para abrir el enlace del recurso en nueva pestana
  // // target="_blank" abre en nueva pestana, rel="noopener" es por seguridad
  html += '<button onclick="toggleFav(' + idx + ')" class="btn-fav' + (isFav(idx) ? ' active' : '') + '" style="border:1px solid var(--border)">' + (isFav(idx) ? '⭐ Favorito' : '☆ Favorito') + '</button>';
  html += '<button onclick="toggleRead(' + idx + ')" class="btn-read' + (isRead(idx) ? ' active' : '') + '" style="border:1px solid var(--border)">' + (isRead(idx) ? '✅ Leído' : '📖 Marcar leído') + '</button>';
  html += '</div>';
  // // botones de favorito y leido

  // Notes
  // // area de notas en la vista de detalle
  const note = state.notes[idx] || '';
  html += '<div style="margin-top:20px"><h3 style="font-size:0.95rem;margin-bottom:8px">📝 Mi Nota</h3>';
  html += '<textarea style="width:100%;min-height:80px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;color:var(--text);font-size:0.85rem" placeholder="Escribe tu nota sobre este libro..." onblur="saveNote(' + idx + ',this.value)">' + escHtml(note) + '</textarea></div>';
  // // textarea mas grande para escribir notas detalladas

  // Related books
  // // libros relacionados en la misma seccion
  if (related.length > 0) {
    html += '<div class="related-section"><h3>📚 Otros en ' + escHtml(sec.titulo) + '</h3><div class="books-grid">';
    related.forEach(r => {
      const rIdx = LIBROS.indexOf(r);
      html += renderBookCard(r, rIdx);
    });
    html += '</div></div>';
  }

  // // mas libros de la misma categoria
  if (sameCat.length > 0) {
    html += '<div class="related-section"><h3>🏷️ Más de ' + escHtml(cat.nombre) + '</h3><div class="books-grid">';
    sameCat.forEach(b => {
      const bIdx = LIBROS.indexOf(b);
      html += renderBookCard(b, bIdx);
    });
    html += '</div></div>';
  }

  html += '</div>';
  return html;
}

// ============================================================================
// NAVIGATION - Moverse entre vistas
// ============================================================================

// ===== NAVIGATION =====
function navigate(view) {
  // // NAVEGAR - cambiar de vista
  // // es como cambiar de pantalla en un juego: home, favoritos, etc.
  state.view = view; // // actualiza el estado
  state.selectedBook = null; // // deselecciona el libro
  renderCurrentView(); // // re-renderiza el contenido
  renderSidebar(); // // actualiza el sidebar (para resaltar el item activo)
  window.scrollTo(0, 0); // // scroll al inicio de la pagina
}

function openBook(idx) {
  // // ABRIR LIBRO - muestra el detalle de un libro especifico
  state.view = 'detail'; // // cambia a la vista de detalle
  state.selectedBook = idx; // // guarda el indice del libro seleccionado
  renderCurrentView(); // // renderiza el detalle
  window.scrollTo(0, 0); // // scroll al inicio
}

function goBack() {
  // // VOLVER - regresa a la vista home
  state.view = 'home';
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
}

function filterCategory(catId) {
  // // FILTRAR POR CATEGORIA - toggle: si ya esta seleccionada, la deselecciona
  if (state.categoryFilter === catId) {
    state.categoryFilter = null; // // deselecciona
    state.sectionFilter = null; // // tambien deselecciona la seccion
  } else {
    state.categoryFilter = catId; // // selecciona la categoria
    state.sectionFilter = null; // // resetea la seccion
  }
  state.view = 'home'; // // siempre vuelve al home al filtrar
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
}

function filterSection(secId) {
  // // FILTRAR POR SECCION - similar a filterCategory
  if (state.sectionFilter === secId) {
    state.sectionFilter = null;
  } else {
    state.sectionFilter = secId;
    state.categoryFilter = seccionInfo(secId).categoria;
    // // tambien activa la categoria padre de esa seccion
  }
  state.view = 'home';
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
}

function filterFormat(fmt) {
  // // FILTRAR POR FORMATO - toggle simple
  state.formatFilter = state.formatFilter === fmt ? null : fmt;
  renderCurrentView();
  renderFilterPills();
}

function setSort(sort) {
  // // CAMBIAR ORDEN - A-Z, Autor, o Seccion
  state.sort = sort;
  renderCurrentView();
  renderFilterPills();
}

function clearFilters() {
  // // LIMPIAR FILTROS - resetea TODO a su estado por defecto
  // // es como el boton "limpiar" de un buscador
  state.search = '';
  state.categoryFilter = null;
  state.sectionFilter = null;
  state.formatFilter = null;
  document.getElementById('searchInput').value = ''; // // limpia el input de busqueda
  renderCurrentView();
  renderSidebar();
  renderFilterPills();
}

function renderCurrentView() {
  // // RENDER CURRENT VIEW - el controlador maestro
  // // segun que vista este activa, llama a la funcion correspondiente
  const content = document.getElementById('content');
  let html = '';
  if (state.view === 'home') html = renderHome();
  else if (state.view === 'favorites') html = renderFavorites();
  else if (state.view === 'reading') html = renderReading();
  else if (state.view === 'stats') html = renderStats();
  else if (state.view === 'detail' && state.selectedBook !== null) html = renderBookDetail(state.selectedBook);
  content.innerHTML = html; // // inyecta el HTML generado en el DOM

  // Update result count
  // // actualiza el contador de resultados "42 / 115"
  if (state.view === 'home') {
    const count = getFilteredBooks().length;
    document.getElementById('resultCount').textContent = count + ' / ' + LIBROS.length;
  } else {
    document.getElementById('resultCount').textContent = '';
  }
}

// ============================================================================
// SEARCH INPUT - El listener de busqueda
// ============================================================================

// ===== SEARCH =====
let searchTimeout;
// // variable para el timeout de busqueda (debounce)
document.getElementById('searchInput').addEventListener('input', function(e) {
  // // cuando escribes en el input de busqueda...
  clearTimeout(searchTimeout); // // cancela el timeout anterior
  searchTimeout = setTimeout(() => {
    // // DEBOUNCE: espera 200ms despues de que el usuario deja de escribir
    // // asi no se busca en cada tecla, sino cuando para
    // // es como cuando esperas a que tu amigo termine de hablar antes de responder
    state.search = e.target.value; // // guarda el texto de busqueda
    if (state.view !== 'home') state.view = 'home'; // // si no estas en home, ve ahi
    renderCurrentView(); // // re-renderiza con los nuevos resultados
  }, 200); // // 200 milisegundos de espera
});

// ============================================================================
// MOBILE - Funciones para dispositivos moviles
// ============================================================================

// ===== MOBILE =====
function toggleSidebar() {
  // // TOGGLE SIDEBAR - abrir/cerrar el menu en movil
  // // en el celular no hay sidebar siempre visible, hay que deslizarlo
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
  // // toggle: si tiene la clase la quita, si no la tiene la agrega
}
document.getElementById('overlay').addEventListener('click', toggleSidebar);
// // al hacer clic en el overlay oscuro, se cierra el sidebar

// ============================================================================
// KEYBOARD SHORTCUTS - Atajos de teclado para eficiencia
// ============================================================================

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
  // // ATAJOS DE TECLADO - para los que odian usar el mouse
  // // Ctrl+K o / para enfocar la busqueda
  if ((e.ctrlKey && e.key === 'k') || (e.key === ' '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
    e.preventDefault(); // // evita el comportamiento por defecto del navegador
    document.getElementById('searchInput').focus(); // // enfoca el input de busqueda
  }
  // // Escape para limpiar la busqueda
  if (e.key === 'Escape') {
    document.getElementById('searchInput').blur(); // // quita el foco del input
    if (state.search) clearFilters(); // // si hay busqueda activa, la limpia
  }
});

// ============================================================================
// EXPORT/IMPORT - Respaldar y restaurar datos
// ============================================================================

// ===== EXPORT/IMPORT =====
function exportData() {
  // // EXPORTAR DATOS - crea un archivo JSON con tus favoritos, leidos y notas
  // // es como hacer backup de tu progreso en la nube (pero local)
  const data = { favorites: state.favorites, read: state.read, notes: state.notes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  // // Blob es como un "objeto de datos" que se puede descargar
  // // JSON.stringify(data, null, 2) convierte a JSON con formato bonito (2 espacios de indentacion)
  const url = URL.createObjectURL(blob); // // crea una URL temporal para el blob
  const a = document.createElement('a'); // // crea un elemento <a> invisible
  a.href = url; a.download = 'tech-library-backup.json'; a.click();
  // // le pone la URL y el nombre de descarga, y hace clic automaticamente
  // // es como si el navegador descargara el archivo solo
  URL.revokeObjectURL(url); // // libera la URL temporal
}

function importData() {
  // // IMPORTAR DATOS - restaura un backup previo
  // // crea un input de archivo invisible y lo activa
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json'; // // solo acepta archivos JSON
  input.onchange = (e) => {
    const file = e.target.files[0]; // // toma el primer archivo seleccionado
    if (!file) return; // // si no selecciona nada, sale
    const reader = new FileReader(); // // FileReader lee archivos del sistema
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result); // // parsea el JSON
        if (data.favorites) state.favorites = data.favorites; // // restaura favoritos
        if (data.read) state.read = data.read; // // restaura leidos
        if (data.notes) state.notes = data.notes; // // restaura notas
        saveState(); // // guarda en localStorage
        renderCurrentView(); // // re-renderiza
        renderSidebar(); // // actualiza sidebar
        alert('Datos importados correctamente.'); // // mensaje de exito
      } catch (err) { alert('Error al importar: ' + err.message); }
      // // si hay error al parsear JSON, muestra el error
    };
    reader.readAsText(file); // // lee el archivo como texto
  };
  input.click(); // // activa el selector de archivos
}

// ============================================================================
// INIT - Arrancar la aplicacion
// ============================================================================

// ===== INIT =====
renderSidebar(); // // dibuja el menu lateral
renderFilterPills(); // // dibuja los pills de filtro
renderCurrentView(); // // dibuja la vista principal
// // y ya esta! la app esta funcionando
// // todo se renderiza dinamicamente con JavaScript
// // no hayFrameworks ni librerias externas, puro vanilla JS
// // asi de simple y elegante es esta aplicacion
</script>
</body>
</html>`;

// ============================================================================
// FILE OUTPUT - Escribir el HTML generado a disco
// ============================================================================

// // Write HTML
// // FINALMENTE escribimos el archivo HTML a disco
// // todo lo que hicimos arriba fue construir el string 'html'
// // y ahora lo guardamos como index.html

const outDir = path.join(__dirname); // // el directorio de salida es donde estamos
fs.mkdirSync(outDir, { recursive: true }); // // crea el directorio si no existe
// // recursive: true significa que crea todos los directorios padres tambien
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
// // escribe el archivo index.html con todo el HTML generado
// // utf8 es la codificacion de caracteres (para que se vean bien los emojis y tildes)
console.log('Generated:', path.join(outDir, 'index.html'));
// // imprime donde se guardo el archivo
console.log('Size:', (Buffer.byteLength(html) / 1024).toFixed(1), 'KB');
// // imprime el tamano del archivo en KB
console.log('Books:', LIBROS.length, '| Sections:', SECCIONES.length, '| Categories:', CATEGORIAS.length);
// // imprime un resumen de cuantos libros, secciones y categorias tiene
// // y con eso TERMINA el generador! ahora tienes un index.html que puedes abrir en tu navegador
// // y tener toda tu libreria tech offline, con busqueda, filtros, favoritos, notas, y estadisticas
// // TODO autocontenido, sin dependencias externas, puro HTML + CSS + JS
// // asi de epico es este archivo bro 🚀
