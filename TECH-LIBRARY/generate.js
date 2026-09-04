#!/usr/bin/env node
/**
 * Generador de TECH-LIBRARY — página offline interactiva.
 * Lee los JSON extraídos y produce un HTML autocontenido.
 */
const fs = require('fs');
const path = require('path');

const LIBROS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'libros-data.json'), 'utf8'));
const SECCIONES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secciones-data.json'), 'utf8'));
const CATEGORIAS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'categorias-data.json'), 'utf8'));

// Build lookup maps
const seccionMap = {};
SECCIONES.forEach(s => { seccionMap[s.id] = s; });

// Compute stats per category
const statsByCategory = {};
CATEGORIAS.forEach(c => {
  const secs = SECCIONES.filter(s => s.categoria === c.id);
  const total = secs.reduce((acc, s) => acc + LIBROS.filter(l => l.seccion === s.id).length, 0);
  statsByCategory[c.id] = { ...c, secciones: secs.length, total };
});

// Compute stats per section
const statsBySection = {};
SECCIONES.forEach(s => {
  statsBySection[s.id] = { ...s, total: LIBROS.filter(l => l.seccion === s.id).length };
});

const DATA = {
  libros: LIBROS,
  secciones: SECCIONES,
  categorias: CATEGORIAS,
  statsByCategory,
  statsBySection
};

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tech Library — UltraIa</title>
<style>
/* ===== RESET & BASE ===== */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --canvas:#08080a;--panel:#111115;--panel-hover:#16161c;--panel-active:#1c1c24;
  --border:#1f1f2a;--border-subtle:#15151e;
  --text:#e4e4e7;--text-secondary:#a1a1aa;--text-muted:#52525b;
  --primary:#8b5cf6;--primary-dim:#7c3aed;--primary-glow:rgba(139,92,246,0.15);
  --success:#22c55e;--warning:#f59e0b;--danger:#ef4444;
  --accent-video:#ef4444;--accent-audio:#3b82f6;--accent-text:#22c55e;--accent-code:#f59e0b;--accent-web:#8b5cf6;
  --radius:8px;--radius-sm:6px;--radius-lg:12px;
  --shadow:0 4px 24px rgba(0,0,0,0.4);
  --font-sans:'Inter',system-ui,-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
}
html{font-size:15px;scroll-behavior:smooth}
body{
  font-family:var(--font-sans);background:var(--canvas);color:var(--text);
  min-height:100vh;line-height:1.6;
}
a{color:var(--primary);text-decoration:none}
a:hover{text-decoration:underline}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,textarea,select{font-family:inherit;color:var(--text);background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;outline:none}
input:focus,textarea:focus,select:focus{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-glow)}
::selection{background:var(--primary);color:#fff}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* ===== LAYOUT ===== */
.app{display:flex;min-height:100vh}
.sidebar{
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
  font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;
  color:var(--text-muted);padding:8px 12px 4px;font-weight:600;
}
.nav-item{
  display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:var(--radius-sm);
  font-size:0.82rem;color:var(--text-secondary);transition:all 0.15s;cursor:pointer;
}
.nav-item:hover{background:var(--panel-hover);color:var(--text)}
.nav-item.active{background:var(--primary-glow);color:var(--primary);font-weight:500}
.nav-item .count{
  margin-left:auto;font-size:0.7rem;background:var(--border);padding:1px 6px;
  border-radius:10px;color:var(--text-muted);
}
.nav-item.active .count{background:rgba(139,92,246,0.2);color:var(--primary)}
.sidebar-footer{padding:12px;border-top:1px solid var(--border);font-size:0.7rem;color:var(--text-muted);text-align:center}

.main{flex:1;margin-left:280px;display:flex;flex-direction:column;min-height:100vh}
.topbar{
  position:sticky;top:0;z-index:5;background:rgba(8,8,10,0.85);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--border);padding:12px 24px;
  display:flex;align-items:center;gap:12px;
}
.search-box{flex:1;position:relative}
.search-box input{
  width:100%;padding:10px 16px 10px 40px;background:var(--panel);border:1px solid var(--border);
  border-radius:var(--radius);font-size:0.9rem;
}
.search-box .icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:1rem}
.filter-pills{display:flex;gap:6px;flex-wrap:wrap}
.pill{
  padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:500;
  border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s;cursor:pointer;
  white-space:nowrap;
}
.pill:hover{border-color:var(--primary);color:var(--text)}
.pill.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.result-count{font-size:0.75rem;color:var(--text-muted);white-space:nowrap}
.content{flex:1;padding:24px}

/* ===== BOOK CARDS ===== */
.books-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.book-card{
  background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);
  padding:20px;transition:all 0.2s;position:relative;display:flex;flex-direction:column;
}
.book-card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:var(--shadow)}
.book-card .card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.book-card .card-title{font-size:0.95rem;font-weight:600;line-height:1.4;flex:1}
.book-card .card-author{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
.book-card .card-meta{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center}
.badge{
  display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;
  font-size:0.7rem;font-weight:500;
}
.badge-format{background:rgba(139,92,246,0.12);color:var(--primary)}
.badge-section{background:rgba(34,197,94,0.1);color:var(--success)}
.badge-category{background:rgba(245,158,11,0.1);color:var(--warning)}
.book-card .card-actions{
  display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);
}
.book-card .card-actions button{
  padding:6px 12px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;
  border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s;
}
.book-card .card-actions button:hover{border-color:var(--primary);color:var(--text)}
.book-card .card-actions .btn-fav.active{background:rgba(245,158,11,0.15);color:var(--warning);border-color:var(--warning)}
.book-card .card-actions .btn-read.active{background:rgba(34,197,94,0.15);color:var(--success);border-color:var(--success)}
.book-card .card-actions .btn-notes{margin-left:auto}
.book-card .card-notes{
  margin-top:8px;padding:8px 12px;background:var(--canvas);border-radius:var(--radius-sm);
  font-size:0.78rem;color:var(--text-secondary);border:1px solid var(--border-subtle);
  display:none;
}
.book-card .card-notes.visible{display:block}
.book-card .card-notes textarea{
  width:100%;min-height:60px;background:transparent;border:none;color:var(--text);
  font-size:0.78rem;resize:vertical;padding:0;
}
.book-card .related{margin-top:10px;font-size:0.72rem;color:var(--text-muted)}
.book-card .related a{font-size:0.72rem;margin-right:8px}

/* ===== VIEWS ===== */
.view{display:none}
.view.active{display:block}
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
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);transition:transform 0.3s}
  .sidebar.open{transform:translateX(0)}
  .main{margin-left:0}
  .topbar{padding:12px 16px}
  .books-grid{grid-template-columns:1fr}
  .mobile-toggle{display:flex!important}
}
.mobile-toggle{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--radius-sm);border:1px solid var(--border)}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9}
.overlay.visible{display:block}

/* ===== KEYBOARD SHORTCUTS HINT ===== */
.shortcuts-hint{
  position:fixed;bottom:16px;right:16px;background:var(--panel);border:1px solid var(--border);
  border-radius:var(--radius);padding:8px 14px;font-size:0.7rem;color:var(--text-muted);
  z-index:20;display:flex;gap:12px;
}
kbd{
  display:inline-block;padding:1px 5px;background:var(--canvas);border:1px solid var(--border);
  border-radius:3px;font-family:var(--font-mono);font-size:0.65rem;
}
</style>
</head>
<body>
<div class="app">
  <!-- SIDEBAR -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>📚 Tech Library</h1>
      <div class="subtitle">115 libros · 32 secciones · 8 categorías</div>
    </div>
    <nav class="sidebar-nav" id="sidebarNav"></nav>
    <div class="sidebar-footer">UltraIa · Offline · Sin conexión</div>
  </aside>

  <!-- OVERLAY (mobile) -->
  <div class="overlay" id="overlay"></div>

  <!-- MAIN -->
  <div class="main">
    <div class="topbar">
      <button class="mobile-toggle" id="mobileToggle" onclick="toggleSidebar()">☰</button>
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Buscar por título, autor, sección... (Ctrl+K)" autocomplete="off">
      </div>
      <div class="filter-pills" id="filterPills"></div>
      <span class="result-count" id="resultCount"></span>
    </div>
    <div class="content" id="content"></div>
  </div>

  <!-- SHORTCUTS -->
  <div class="shortcuts-hint">
    <span><kbd>/</kbd> Buscar</span>
    <span><kbd>Esc</kbd> Limpiar</span>
    <span><kbd>←→</kbd> Navegar</span>
  </div>
</div>

<script>
// ===== DATA =====
const LIBROS = ${JSON.stringify(LIBROS)};
const SECCIONES = ${JSON.stringify(SECCIONES)};
const CATEGORIAS = ${JSON.stringify(CATEGORIAS)};

// ===== STATE =====
let state = {
  view: 'home',
  search: '',
  categoryFilter: null,
  sectionFilter: null,
  formatFilter: null,
  favorites: JSON.parse(localStorage.getItem('tl_favorites') || '[]'),
  read: JSON.parse(localStorage.getItem('tl_read') || '[]'),
  notes: JSON.parse(localStorage.getItem('tl_notes') || '{}'),
  selectedBook: null,
  sort: 'title' // title | author | section
};

function saveState() {
  localStorage.setItem('tl_favorites', JSON.stringify(state.favorites));
  localStorage.setItem('tl_read', JSON.stringify(state.read));
  localStorage.setItem('tl_notes', JSON.stringify(state.notes));
}

// ===== HELPERS =====
function quitarAcentos(s) {
  return s.normalize('NFD').replace(/\\p{Diacritic}/gu, '').toLowerCase();
}

function seccionInfo(id) {
  return SECCIONES.find(s => s.id === id) || { titulo: id, descripcion: '', categoria: '' };
}

function categoriaInfo(id) {
  return CATEGORIAS.find(c => c.id === id) || { nombre: id };
}

function librosPorSeccion(seccionId) {
  return LIBROS.filter(l => l.seccion === seccionId);
}

function countByCategory(catId) {
  const secs = SECCIONES.filter(s => s.categoria === catId);
  return secs.reduce((acc, s) => acc + LIBROS.filter(l => l.seccion === s.id).length, 0);
}

function countBySection(secId) {
  return LIBROS.filter(l => l.seccion === secId).length;
}

function isFav(idx) { return state.favorites.includes(idx); }
function isRead(idx) { return state.read.includes(idx); }

function toggleFav(idx, e) {
  e && e.stopPropagation();
  const i = state.favorites.indexOf(idx);
  if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(idx);
  saveState(); renderCurrentView();
}

function toggleRead(idx, e) {
  e && e.stopPropagation();
  const i = state.read.indexOf(idx);
  if (i >= 0) state.read.splice(i, 1); else state.read.push(idx);
  saveState(); renderCurrentView();
}

function toggleNotes(idx, e) {
  e && e.stopPropagation();
  const card = document.querySelector('[data-book-idx="' + idx + '"] .card-notes');
  if (card) card.classList.toggle('visible');
}

function saveNote(idx, text) {
  state.notes[idx] = text;
  saveState();
}

// ===== SEARCH & FILTER =====
function getFilteredBooks() {
  let books = LIBROS.map((b, i) => ({ ...b, _idx: i }));

  // Search
  if (state.search) {
    const terms = quitarAcentos(state.search).split(/\\s+/).filter(Boolean);
    books = books.filter(b => {
      const titulo = quitarAcentos(b.titulo);
      const autor = b.autor ? quitarAcentos(b.autor) : '';
      const sec = quitarAcentos(seccionInfo(b.seccion).titulo);
      return terms.every(t => titulo.includes(t) || autor.includes(t) || sec.includes(t));
    });
  }

  // Category filter
  if (state.categoryFilter) {
    const secIds = SECCIONES.filter(s => s.categoria === state.categoryFilter).map(s => s.id);
    books = books.filter(b => secIds.includes(b.seccion));
  }

  // Section filter
  if (state.sectionFilter) {
    books = books.filter(b => b.seccion === state.sectionFilter);
  }

  // Format filter
  if (state.formatFilter) {
    if (state.formatFilter === 'none') {
      books = books.filter(b => !b.formato);
    } else {
      books = books.filter(b => b.formato && quitarAcentos(b.formato).includes(quitarAcentos(state.formatFilter)));
    }
  }

  // Sort
  books.sort((a, b) => {
    if (state.sort === 'author') return (a.autor || 'zzz').localeCompare(b.autor || 'zzz', 'es');
    if (state.sort === 'section') return a.seccion.localeCompare(b.seccion) || a.titulo.localeCompare(b.titulo, 'es');
    return a.titulo.localeCompare(b.titulo, 'es');
  });

  return books;
}

// ===== RENDER SIDEBAR =====
function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  let html = '';

  // Home
  html += '<div class="nav-section">';
  html += '<div class="nav-item' + (state.view === 'home' ? ' active' : '') + '" onclick="navigate(\'home\')">';
  html += '🏠 <span>Inicio</span><span class="count">' + LIBROS.length + '</span></div>';
  html += '<div class="nav-item' + (state.view === 'favorites' ? ' active' : '') + '" onclick="navigate(\'favorites\')">';
  html += '⭐ <span>Favoritos</span><span class="count">' + state.favorites.length + '</span></div>';
  html += '<div class="nav-item' + (state.view === 'reading' ? ' active' : '') + '" onclick="navigate(\'reading\')">';
  html += '📖 <span>Leyendo</span><span class="count">' + state.read.length + '</span></div>';
  html += '<div class="nav-item' + (state.view === 'stats' ? ' active' : '') + '" onclick="navigate(\'stats\')">';
  html += '📊 <span>Estadísticas</span></div>';
  html += '</div>';

  // Categories
  html += '<div class="nav-section"><div class="nav-section-title">Categorías</div>';
  CATEGORIAS.forEach(cat => {
    const count = countByCategory(cat.id);
    const isActive = state.categoryFilter === cat.id && state.view === 'home';
    html += '<div class="nav-item' + (isActive ? ' active' : '') + '" onclick="filterCategory(\'' + cat.id + '\')">';
    html += '<span>' + cat.nombre + '</span><span class="count">' + count + '</span></div>';
  });
  html += '</div>';

  // Sections (when category selected)
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

  nav.innerHTML = html;
}

// ===== RENDER FILTER PILLS =====
function renderFilterPills() {
  const container = document.getElementById('filterPills');
  let html = '';

  // Format pills
  const formats = ['PDF', 'HTML', 'eBook', 'none'];
  const formatLabels = { 'PDF': '📄 PDF', 'HTML': '🌐 HTML', 'eBook': '📱 eBook', 'none': '❓ Sin formato' };
  formats.forEach(f => {
    const isActive = state.formatFilter === f;
    html += '<button class="pill' + (isActive ? ' active' : '') + '" onclick="filterFormat(\'' + f + '\')">' + formatLabels[f] + '</button>';
  });

  // Sort pills
  html += '<button class="pill' + (state.sort === 'title' ? ' active' : '') + '" onclick="setSort(\'title\')">A-Z</button>';
  html += '<button class="pill' + (state.sort === 'author' ? ' active' : '') + '" onclick="setSort(\'author\')">Autor</button>';
  html += '<button class="pill' + (state.sort === 'section' ? ' active' : '') + '" onclick="setSort(\'section\')">Sección</button>';

  container.innerHTML = html;
}

// ===== RENDER BOOK CARD =====
function renderBookCard(book, idx) {
  const sec = seccionInfo(book.seccion);
  const cat = categoriaInfo(sec.categoria);
  const related = librosPorSeccion(book.seccion).filter((_, i) => LIBROS.indexOf(librosPorSeccion(book.seccion)[i]) !== idx).slice(0, 3);
  const note = state.notes[idx] || '';

  let html = '<div class="book-card" data-book-idx="' + idx + '" onclick="openBook(' + idx + ')">';
  html += '<div class="card-header"><div class="card-title">' + escHtml(book.titulo) + '</div></div>';
  if (book.autor) html += '<div class="card-author">' + escHtml(book.autor) + '</div>';
  html += '<div class="card-meta">';
  if (book.formato) html += '<span class="badge badge-format">' + escHtml(book.formato) + '</span>';
  html += '<span class="badge badge-section">' + escHtml(sec.titulo) + '</span>';
  html += '<span class="badge badge-category">' + escHtml(cat.nombre) + '</span>';
  html += '</div>';

  // Actions
  html += '<div class="card-actions">';
  html += '<button class="btn-fav' + (isFav(idx) ? ' active' : '') + '" onclick="toggleFav(' + idx + ',event)" title="Favorito">' + (isFav(idx) ? '⭐' : '☆') + ' Fav</button>';
  html += '<button class="btn-read' + (isRead(idx) ? ' active' : '') + '" onclick="toggleRead(' + idx + ',event)" title="Marcar leído">' + (isRead(idx) ? '✅' : '📖') + ' Leer</button>';
  html += '<button class="btn-notes" onclick="toggleNotes(' + idx + ',event)" title="Notas">📝 Notas</button>';
  html += '</div>';

  // Notes
  html += '<div class="card-notes' + (note ? ' visible' : '') + '">';
  html += '<textarea placeholder="Escribe una nota..." onclick="event.stopPropagation()" onblur="saveNote(' + idx + ',this.value)">' + escHtml(note) + '</textarea>';
  html += '</div>';

  // Related
  if (related.length > 0) {
    html += '<div class="related">📚 Relacionados: ';
    related.forEach(r => {
      const rIdx = LIBROS.indexOf(r);
      html += '<a href="javascript:void(0)" onclick="openBook(' + rIdx + ');event.stopPropagation()">' + escHtml(r.titulo.substring(0, 30)) + (r.titulo.length > 30 ? '...' : '') + '</a>';
    });
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== RENDER VIEWS =====
function renderHome() {
  const books = getFilteredBooks();
  let html = '';

  // Hero stats
  if (!state.search && !state.categoryFilter && !state.sectionFilter && !state.formatFilter) {
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-value">' + LIBROS.length + '</div><div class="stat-label">Libros</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + SECCIONES.length + '</div><div class="stat-label">Secciones</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + CATEGORIAS.length + '</div><div class="stat-label">Categorías</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + state.favorites.length + '</div><div class="stat-label">Favoritos</div></div>';
    html += '</div>';
  }

  // Book grid
  html += '<div class="books-grid">';
  if (books.length === 0) {
    html += '<div class="empty-state"><div class="icon">📭</div><p>No se encontraron libros con esos filtros.</p></div>';
  } else {
    books.forEach(b => { html += renderBookCard(b, b._idx); });
  }
  html += '</div>';

  return html;
}

function renderFavorites() {
  const books = state.favorites.map(i => ({ ...LIBROS[i], _idx: i }));
  let html = '<h2 style="margin-bottom:16px">⭐ Mis Favoritos</h2>';
  if (books.length === 0) {
    html += '<div class="empty-state"><div class="icon">⭐</div><p>No tienes favoritos aún. Haz clic en ☆ en cualquier libro.</p></div>';
  } else {
    html += '<div class="books-grid">';
    books.forEach(b => { html += renderBookCard(b, b._idx); });
    html += '</div>';
  }
  return html;
}

function renderReading() {
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
  let html = '<h2 style="margin-bottom:20px">📊 Estadísticas</h2>';

  // Category breakdown
  html += '<h3 style="margin:16px 0 12px;color:var(--text-secondary)">Por Categoría</h3>';
  html += '<div class="stats-grid">';
  CATEGORIAS.forEach(cat => {
    const total = countByCategory(cat.id);
    const pct = Math.round((total / LIBROS.length) * 100);
    html += '<div class="stat-card" style="cursor:pointer" onclick="filterCategory(\'' + cat.id + '\')">';
    html += '<div class="stat-value">' + total + '</div>';
    html += '<div class="stat-label">' + cat.nombre + ' (' + pct + '%)</div>';
    html += '</div>';
  });
  html += '</div>';

  // Format breakdown
  const formatCounts = {};
  LIBROS.forEach(b => {
    const f = b.formato || 'Sin formato';
    formatCounts[f] = (formatCounts[f] || 0) + 1;
  });
  html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Por Formato</h3>';
  html += '<div class="stats-grid">';
  Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).forEach(([fmt, count]) => {
    const pct = Math.round((count / LIBROS.length) * 100);
    html += '<div class="stat-card"><div class="stat-value">' + count + '</div>';
    html += '<div class="stat-label">' + escHtml(fmt) + ' (' + pct + '%)</div></div>';
  });
  html += '</div>';

  // Section breakdown
  html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Por Sección</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px">';
  SECCIONES.forEach(s => {
    const count = countBySection(s.id);
    const pct = Math.round((count / LIBROS.length) * 100);
    const barW = Math.max(4, pct * 2);
    html += '<div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer" onclick="filterSection(\'' + s.id + '\')">';
    html += '<div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:4px">';
    html += '<span>' + escHtml(s.titulo) + '</span><span style="color:var(--text-muted)">' + count + '</span></div>';
    html += '<div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">';
    html += '<div style="height:100%;width:' + barW + '%;background:var(--primary);border-radius:2px;transition:width 0.3s"></div></div></div>';
  });
  html += '</div>';

  // User stats
  html += '<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Mi Progreso</h3>';
  html += '<div class="stats-grid">';
  html += '<div class="stat-card"><div class="stat-value">' + state.read.length + '</div><div class="stat-label">Leídos</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + state.favorites.length + '</div><div class="stat-label">Favoritos</div></div>';
  const notesCount = Object.keys(state.notes).filter(k => state.notes[k].trim()).length;
  html += '<div class="stat-card"><div class="stat-value">' + notesCount + '</div><div class="stat-label">Con Notas</div></div>';
  html += '</div>';

  return html;
}

function renderBookDetail(idx) {
  const book = LIBROS[idx];
  const sec = seccionInfo(book.seccion);
  const cat = categoriaInfo(sec.categoria);
  const related = librosPorSeccion(book.seccion).filter((_, i) => {
    const realIdx = LIBROS.indexOf(librosPorSeccion(book.seccion)[i]);
    return realIdx !== idx;
  });
  const sameCat = LIBROS.filter((b, i) => {
    const s = seccionInfo(b.seccion);
    return s.categoria === sec.categoria && b.seccion !== book.seccion;
  }).slice(0, 6);

  let html = '<div class="book-detail">';
  html += '<button onclick="goBack()" style="margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">← Volver</button>';
  html += '<h2>' + escHtml(book.titulo) + '</h2>';
  if (book.autor) html += '<p style="color:var(--text-secondary);font-size:0.9rem">por ' + escHtml(book.autor) + '</p>';

  html += '<div class="detail-meta">';
  if (book.formato) html += '<span class="badge badge-format">' + escHtml(book.formato) + '</span>';
  html += '<span class="badge badge-section">' + escHtml(sec.titulo) + '</span>';
  html += '<span class="badge badge-category">' + escHtml(cat.nombre) + '</span>';
  html += '</div>';

  html += '<p class="detail-desc">' + escHtml(sec.descripcion) + '</p>';

  html += '<div class="detail-actions">';
  html += '<a href="' + escHtml(book.url) + '" target="_blank" rel="noopener" class="btn-primary">🔗 Abrir recurso</a>';
  html += '<button onclick="toggleFav(' + idx + ')" class="btn-fav' + (isFav(idx) ? ' active' : '') + '" style="border:1px solid var(--border)">' + (isFav(idx) ? '⭐ Favorito' : '☆ Favorito') + '</button>';
  html += '<button onclick="toggleRead(' + idx + ')" class="btn-read' + (isRead(idx) ? ' active' : '') + '" style="border:1px solid var(--border)">' + (isRead(idx) ? '✅ Leído' : '📖 Marcar leído') + '</button>';
  html += '</div>';

  // Notes
  const note = state.notes[idx] || '';
  html += '<div style="margin-top:20px"><h3 style="font-size:0.95rem;margin-bottom:8px">📝 Mi Nota</h3>';
  html += '<textarea style="width:100%;min-height:80px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;color:var(--text);font-size:0.85rem" placeholder="Escribe tu nota sobre este libro..." onblur="saveNote(' + idx + ',this.value)">' + escHtml(note) + '</textarea></div>';

  // Related books
  if (related.length > 0) {
    html += '<div class="related-section"><h3>📚 Otros en ' + escHtml(sec.titulo) + '</h3><div class="books-grid">';
    related.forEach(r => {
      const rIdx = LIBROS.indexOf(r);
      html += renderBookCard(r, rIdx);
    });
    html += '</div></div>';
  }

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

// ===== NAVIGATION =====
function navigate(view) {
  state.view = view;
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
  window.scrollTo(0, 0);
}

function openBook(idx) {
  state.view = 'detail';
  state.selectedBook = idx;
  renderCurrentView();
  window.scrollTo(0, 0);
}

function goBack() {
  state.view = 'home';
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
}

function filterCategory(catId) {
  if (state.categoryFilter === catId) {
    state.categoryFilter = null;
    state.sectionFilter = null;
  } else {
    state.categoryFilter = catId;
    state.sectionFilter = null;
  }
  state.view = 'home';
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
}

function filterSection(secId) {
  if (state.sectionFilter === secId) {
    state.sectionFilter = null;
  } else {
    state.sectionFilter = secId;
    state.categoryFilter = seccionInfo(secId).categoria;
  }
  state.view = 'home';
  state.selectedBook = null;
  renderCurrentView();
  renderSidebar();
}

function filterFormat(fmt) {
  state.formatFilter = state.formatFilter === fmt ? null : fmt;
  renderCurrentView();
  renderFilterPills();
}

function setSort(sort) {
  state.sort = sort;
  renderCurrentView();
  renderFilterPills();
}

function clearFilters() {
  state.search = '';
  state.categoryFilter = null;
  state.sectionFilter = null;
  state.formatFilter = null;
  document.getElementById('searchInput').value = '';
  renderCurrentView();
  renderSidebar();
  renderFilterPills();
}

function renderCurrentView() {
  const content = document.getElementById('content');
  let html = '';
  if (state.view === 'home') html = renderHome();
  else if (state.view === 'favorites') html = renderFavorites();
  else if (state.view === 'reading') html = renderReading();
  else if (state.view === 'stats') html = renderStats();
  else if (state.view === 'detail' && state.selectedBook !== null) html = renderBookDetail(state.selectedBook);
  content.innerHTML = html;

  // Update result count
  if (state.view === 'home') {
    const count = getFilteredBooks().length;
    document.getElementById('resultCount').textContent = count + ' / ' + LIBROS.length;
  } else {
    document.getElementById('resultCount').textContent = '';
  }
}

// ===== SEARCH =====
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', function(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.search = e.target.value;
    if (state.view !== 'home') state.view = 'home';
    renderCurrentView();
  }, 200);
});

// ===== MOBILE =====
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('visible');
}
document.getElementById('overlay').addEventListener('click', toggleSidebar);

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', function(e) {
  // Ctrl+K or / to focus search
  if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
  // Esc to clear
  if (e.key === 'Escape') {
    document.getElementById('searchInput').blur();
    if (state.search) clearFilters();
  }
});

// ===== EXPORT/IMPORT =====
function exportData() {
  const data = { favorites: state.favorites, read: state.read, notes: state.notes };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tech-library-backup.json'; a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.favorites) state.favorites = data.favorites;
        if (data.read) state.read = data.read;
        if (data.notes) state.notes = data.notes;
        saveState();
        renderCurrentView();
        renderSidebar();
        alert('Datos importados correctamente.');
      } catch (err) { alert('Error al importar: ' + err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== INIT =====
renderSidebar();
renderFilterPills();
renderCurrentView();
</script>
</body>
</html>`;

// Write HTML
const outDir = path.join(__dirname);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
console.log('Generated:', path.join(outDir, 'index.html'));
console.log('Size:', (Buffer.byteLength(html) / 1024).toFixed(1), 'KB');
console.log('Books:', LIBROS.length, '| Sections:', SECCIONES.length, '| Categories:', CATEGORIAS.length);
