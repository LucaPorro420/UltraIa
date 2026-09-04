#!/usr/bin/env node
/**
 * Generador unificado TECH-LIBRARY — libros + documentación de tecnologías.
 */
const fs = require('fs');
const path = require('path');

// ===== LOAD BOOKS =====
const LIBROS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'libros-data.json'), 'utf8'));
const SECCIONES = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'secciones-data.json'), 'utf8'));
const CATEGORIAS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'categorias-data.json'), 'utf8'));

// ===== LOAD TECH DOCS =====
const TECH_DIR = path.join(__dirname, 'Completo');
const techFiles = fs.readdirSync(TECH_DIR).filter(f => f.endsWith('.md') && f !== 'INDEX.md' && f !== 'README.md');

const TECH_CATEGORIES = {
  'frontend': { nombre: 'Frontend', icon: '🎨', color: '#8b5cf6' },
  'backend': { nombre: 'Backend', icon: '⚙️', color: '#3b82f6' },
  'database': { nombre: 'Base de Datos', icon: '🗄️', color: '#22c55e' },
  'ai-ml': { nombre: 'IA/ML', icon: '🤖', color: '#ef4444' },
  'mobile': { nombre: 'Móvil', icon: '📱', color: '#f59e0b' },
  'animation': { nombre: 'Animación/3D', icon: '🎬', color: '#ec4899' },
  'testing': { nombre: 'Testing', icon: '🧪', color: '#06b6d4' },
  'infra': { nombre: 'Infraestructura', icon: '☁️', color: '#8b5cf6' },
  'realtime': { nombre: 'Tiempo Real', icon: '⚡', color: '#f59e0b' },
  'security': { nombre: 'Seguridad', icon: '🔒', color: '#ef4444' },
  'devops': { nombre: 'DevOps', icon: '🚀', color: '#22c55e' },
  'tools': { nombre: 'Herramientas', icon: '🛠️', color: '#6366f1' }
};

const TECH_MAP = {
  'nextjs-15': { cat: 'frontend', title: 'Next.js 15', version: '15.3.3', tags: ['react','ssr','app-router','turbopack'] },
  'react-19': { cat: 'frontend', title: 'React 19', version: '19.2.3', tags: ['hooks','server-components','compiler'] },
  'typescript-5': { cat: 'frontend', title: 'TypeScript 5.8', version: '5.8.2', tags: ['types','generics','pattern-matching'] },
  'tailwind-v4': { cat: 'frontend', title: 'Tailwind CSS v4', version: '4.1.4', tags: ['css','design-system','@theme'] },
  'vercel-ai-sdk': { cat: 'backend', title: 'Vercel AI SDK', version: '4.1.61', tags: ['ai','streaming','tools','agents'] },
  'zod': { cat: 'backend', title: 'Zod', version: '3.24.2', tags: ['validation','schema','typescript'] },
  'nodejs-patterns': { cat: 'backend', title: 'Node.js Patterns', version: '20+', tags: ['api','middleware','streams'] },
  'prisma-sqlite': { cat: 'database', title: 'Prisma + SQLite', version: '6.7.0', tags: ['orm','sql','migrations'] },
  'ai-sdk-providers': { cat: 'ai-ml', title: 'AI Providers', version: '-', tags: ['openai','google','anthropic'] },
  'llm-agents': { cat: 'ai-ml', title: 'LLM Agents', version: '-', tags: ['agents','tools','capabilities'] },
  'expo-react-native': { cat: 'mobile', title: 'Expo + React Native', version: 'SDK 57', tags: ['mobile','ios','android'] },
  'gsap': { cat: 'animation', title: 'GSAP', version: '3.15.0', tags: ['animation','scroll','timeline'] },
  'threejs': { cat: 'animation', title: 'Three.js', version: '0.185.1', tags: ['webgl','3d','shaders'] },
  'lottie': { cat: 'animation', title: 'Lottie', version: '2.4.1', tags: ['after-effects','animation'] },
  'vitest': { cat: 'testing', title: 'Vitest', version: '3.0.9', tags: ['unit','mocking','coverage'] },
  'playwright': { cat: 'testing', title: 'Playwright', version: '1.62.1', tags: ['e2e','browser','automation'] },
  'cloudflare-workers': { cat: 'infra', title: 'Cloudflare Workers', version: '-', tags: ['edge','r2','d1'] },
  'docker': { cat: 'infra', title: 'Docker', version: '-', tags: ['containers','compose'] },
  'websocket': { cat: 'realtime', title: 'WebSocket', version: '-', tags: ['realtime','ws'] },
  'webrtc': { cat: 'realtime', title: 'WebRTC', version: '-', tags: ['p2p','video','data-channels'] },
  'auth-patterns': { cat: 'security', title: 'Auth Patterns', version: '-', tags: ['jwt','oauth2','rbac','sessions'] },
  'git-workflows': { cat: 'devops', title: 'Git Workflows', version: '-', tags: ['branching','ci-cd','hooks'] },
  'npm-workspaces': { cat: 'devops', title: 'npm Workspaces', version: '-', tags: ['monorepo','packages'] },
  'eslint-prettier': { cat: 'tools', title: 'ESLint + Prettier', version: '-', tags: ['linting','formatting'] },
  'repomix': { cat: 'tools', title: 'Repomix', version: '1.18.0', tags: ['repo-packaging','llm'] }
};

const TECHNOLOGIES = [];
techFiles.forEach(f => {
  const slug = f.replace('.md', '');
  const content = fs.readFileSync(path.join(TECH_DIR, f), 'utf8');
  const meta = TECH_MAP[slug] || { cat: 'tools', title: slug, version: '-', tags: [] };
  const catInfo = TECH_CATEGORIES[meta.cat] || { nombre: 'Otros', icon: '📦', color: '#6366f1' };

  // Extract sections
  const sections = [];
  let currentSection = null;
  content.split('\n').forEach(line => {
    if (line.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.replace('## ', ''), content: '' };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  });
  if (currentSection) sections.push(currentSection);

  TECHNOLOGIES.push({
    slug,
    title: meta.title,
    version: meta.version,
    category: meta.cat,
    categoryName: catInfo.nombre,
    categoryIcon: catInfo.icon,
    categoryColor: catInfo.color,
    tags: meta.tags,
    sections,
    rawContent: content.substring(0, 5000) // first 5KB for preview
  });
});

// Cross-reference: map books to technologies
const BOOK_TECH_MAP = {
  'javascript': ['nextjs-15', 'react-19', 'nodejs-patterns'],
  'typescript': ['typescript-5', 'nextjs-15', 'react-19'],
  'python': ['ai-sdk-providers', 'docker'],
  'react': ['react-19', 'nextjs-15', 'tailwind-v4'],
  'nodejs': ['nodejs-patterns', 'vercel-ai-sdk'],
  'angular': [],
  'vue': [],
  'rust': [],
  'golang': [],
  'java': [],
  'csharp': [],
  'cplusplus': [],
  'c': [],
  'ruby': [],
  'php': [],
  'haskell': [],
  'kotlin': ['expo-react-native'],
  'android': ['expo-react-native'],
  'sql': ['prisma-sqlite'],
  'nosql': ['prisma-sqlite'],
  'docker': ['docker'],
  'git': ['git-workflows'],
  'linux': ['docker'],
  'ia': ['ai-sdk-providers', 'llm-agents'],
  'blockchain': [],
  'html-css': ['tailwind-v4'],
  'r': [],
  'generales': [],
  'algoritmos': [],
  'sistemas-operativos': [],
  'metodologias': [],
  'qwik': [],
  'angular': [],
  'django': [],
  'web': []
};

// ===== BUILD HTML =====
const DATA = { LIBROS, SECCIONES, CATEGORIAS, TECHNOLOGIES, TECH_CATEGORIES };

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tech Library — UltraIa</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
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
body{font-family:var(--font-sans);background:var(--canvas);color:var(--text);min-height:100vh;line-height:1.6}
a{color:var(--primary);text-decoration:none}a:hover{text-decoration:underline}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit}
input,textarea,select{font-family:inherit;color:var(--text);background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;outline:none}
input:focus,textarea:focus{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-glow)}
::selection{background:var(--primary);color:#fff}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
.app{display:flex;min-height:100vh}
.sidebar{width:280px;min-width:280px;background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;top:0;left:0;bottom:0;z-index:10;overflow-y:auto}
.sidebar-header{padding:20px;border-bottom:1px solid var(--border)}
.sidebar-header h1{font-size:1.1rem;font-weight:700}
.sidebar-header .subtitle{font-size:0.72rem;color:var(--text-muted);margin-top:2px}
.sidebar-nav{flex:1;overflow-y:auto;padding:8px}
.nav-section{margin-bottom:4px}
.nav-section-title{font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);padding:8px 12px 4px;font-weight:600}
.nav-item{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-secondary);transition:all 0.15s;cursor:pointer}
.nav-item:hover{background:var(--panel-hover);color:var(--text)}
.nav-item.active{background:var(--primary-glow);color:var(--primary);font-weight:500}
.nav-item .count{margin-left:auto;font-size:0.7rem;background:var(--border);padding:1px 6px;border-radius:10px;color:var(--text-muted)}
.nav-item.active .count{background:rgba(139,92,246,0.2);color:var(--primary)}
.sidebar-footer{padding:12px;border-top:1px solid var(--border);font-size:0.7rem;color:var(--text-muted);text-align:center}
.main{flex:1;margin-left:280px;display:flex;flex-direction:column;min-height:100vh}
.topbar{position:sticky;top:0;z-index:5;background:rgba(8,8,10,0.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:12px 24px;display:flex;align-items:center;gap:12px}
.search-box{flex:1;position:relative}
.search-box input{width:100%;padding:10px 16px 10px 40px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);font-size:0.9rem}
.search-box .icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted)}
.filter-pills{display:flex;gap:6px;flex-wrap:wrap}
.pill{padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:500;border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s;cursor:pointer;white-space:nowrap}
.pill:hover{border-color:var(--primary);color:var(--text)}
.pill.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.pill.book-pill{border-color:rgba(34,197,94,0.3);color:var(--success)}
.pill.book-pill.active{background:var(--success);border-color:var(--success)}
.pill.tech-pill{border-color:rgba(139,92,246,0.3);color:var(--primary)}
.pill.tech-pill.active{background:var(--primary);border-color:var(--primary)}
.result-count{font-size:0.75rem;color:var(--text-muted);white-space:nowrap}
.content{flex:1;padding:24px}
.books-grid,.tech-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;transition:all 0.2s;display:flex;flex-direction:column}
.card:hover{border-color:var(--primary);transform:translateY(-2px);box-shadow:var(--shadow)}
.card .card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.card .card-title{font-size:0.95rem;font-weight:600;line-height:1.4;flex:1}
.card .card-subtitle{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
.card .card-meta{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:0.7rem;font-weight:500}
.badge-format{background:rgba(139,92,246,0.12);color:var(--primary)}
.badge-section{background:rgba(34,197,94,0.1);color:var(--success)}
.badge-category{background:rgba(245,158,11,0.1);color:var(--warning)}
.badge-tech{background:rgba(236,72,153,0.1);color:#ec4899}
.badge-version{background:rgba(6,182,212,0.1);color:#06b6d4}
.card .card-actions{display:flex;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle)}
.card .card-actions button{padding:6px 12px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;border:1px solid var(--border);color:var(--text-secondary);transition:all 0.15s}
.card .card-actions button:hover{border-color:var(--primary);color:var(--text)}
.card .card-actions .btn-fav.active{background:rgba(245,158,11,0.15);color:var(--warning);border-color:var(--warning)}
.card .card-actions .btn-read.active{background:rgba(34,197,94,0.15);color:var(--success);border-color:var(--success)}
.card .card-notes{margin-top:8px;padding:8px 12px;background:var(--canvas);border-radius:var(--radius-sm);font-size:0.78rem;color:var(--text-secondary);border:1px solid var(--border-subtle);display:none}
.card .card-notes.visible{display:block}
.card .card-notes textarea{width:100%;min-height:60px;background:transparent;border:none;color:var(--text);font-size:0.78rem;resize:vertical;padding:0}
.card .related{margin-top:10px;font-size:0.72rem;color:var(--text-muted)}
.card .related a{font-size:0.72rem;margin-right:8px}
.view{display:none}.view.active{display:block}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;text-align:center;cursor:pointer;transition:all 0.2s}
.stat-card:hover{border-color:var(--primary);transform:translateY(-2px)}
.stat-card .stat-value{font-size:2rem;font-weight:700;color:var(--primary)}
.stat-card .stat-label{font-size:0.8rem;color:var(--text-secondary);margin-top:4px}
.book-detail,.tech-detail{max-width:800px;margin:0 auto}
.book-detail h2,.tech-detail h2{font-size:1.5rem;font-weight:700;margin-bottom:8px}
.detail-meta{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
.detail-desc{color:var(--text-secondary);margin:16px 0;line-height:1.7}
.detail-actions{display:flex;gap:8px;margin:20px 0;flex-wrap:wrap}
.detail-actions a,.detail-actions button{padding:10px 20px;border-radius:var(--radius);font-weight:500;font-size:0.85rem;border:1px solid var(--border);transition:all 0.15s}
.detail-actions .btn-primary{background:var(--primary);color:#fff;border-color:var(--primary)}
.detail-actions .btn-primary:hover{background:var(--primary-dim)}
.related-section{margin-top:32px;padding-top:20px;border-top:1px solid var(--border)}
.related-section h3{font-size:1rem;font-weight:600;margin-bottom:12px}
.tech-content{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin:16px 0}
.tech-content h3{font-size:1rem;font-weight:600;margin:16px 0 8px;color:var(--primary)}
.tech-content pre{background:var(--canvas);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;overflow-x:auto;font-size:0.8rem;font-family:var(--font-mono);margin:8px 0}
.tech-content code{font-family:var(--font-mono);font-size:0.85em;background:var(--canvas);padding:1px 4px;border-radius:3px}
.tech-content pre code{background:none;padding:0}
.tech-content ul,.tech-content ol{padding-left:20px;margin:8px 0}
.tech-content li{margin:4px 0;color:var(--text-secondary)}
.tech-content p{margin:8px 0;color:var(--text-secondary)}
.tech-content strong{color:var(--text)}
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}
.empty-state .icon{font-size:3rem;margin-bottom:12px}
.tag-list{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
.tag{font-size:0.65rem;padding:1px 6px;background:var(--border);border-radius:8px;color:var(--text-muted)}
@media(max-width:768px){.sidebar{transform:translateX(-100%);transition:transform 0.3s}.sidebar.open{transform:translateX(0)}.main{margin-left:0}.books-grid,.tech-grid{grid-template-columns:1fr}.mobile-toggle{display:flex!important}}
.mobile-toggle{display:none;align-items:center;justify-content:center;width:36px;height:36px;border-radius:var(--radius-sm);border:1px solid var(--border)}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9}.overlay.visible{display:block}
.shortcuts-hint{position:fixed;bottom:16px;right:16px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:8px 14px;font-size:0.7rem;color:var(--text-muted);z-index:20;display:flex;gap:12px}
kbd{display:inline-block;padding:1px 5px;background:var(--canvas);border:1px solid var(--border);border-radius:3px;font-family:var(--font-mono);font-size:0.65rem}
.tab-bar{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab{padding:10px 20px;font-size:0.85rem;font-weight:500;color:var(--text-muted);border-bottom:2px solid transparent;transition:all 0.15s;cursor:pointer}
.tab:hover{color:var(--text)}
.tab.active{color:var(--primary);border-bottom-color:var(--primary)}
</style>
</head>
<body>
<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>📚 Tech Library</h1>
      <div class="subtitle">${LIBROS.length} libros · ${TECHNOLOGIES.length} tecnologías · Offline</div>
    </div>
    <nav class="sidebar-nav" id="sidebarNav"></nav>
    <div class="sidebar-footer">UltraIa · Sin conexión · ${new Date().toISOString().split('T')[0]}</div>
  </aside>
  <div class="overlay" id="overlay"></div>
  <div class="main">
    <div class="topbar">
      <button class="mobile-toggle" onclick="toggleSidebar()">☰</button>
      <div class="search-box">
        <span class="icon">🔍</span>
        <input type="text" id="searchInput" placeholder="Buscar libros, tecnologías... (Ctrl+K)" autocomplete="off">
      </div>
      <div class="filter-pills" id="filterPills"></div>
      <span class="result-count" id="resultCount"></span>
    </div>
    <div class="content" id="content"></div>
  </div>
  <div class="shortcuts-hint">
    <span><kbd>/</kbd> Buscar</span>
    <span><kbd>Esc</kbd> Limpiar</span>
    <span><kbd>1-2</kbd> Tab</span>
  </div>
</div>

<script>
// ===== DATA =====
const LIBROS = ${JSON.stringify(LIBROS)};
const SECCIONES = ${JSON.stringify(SECCIONES)};
const CATEGORIAS = ${JSON.stringify(CATEGORIAS)};
const TECHNOLOGIES = ${JSON.stringify(TECHNOLOGIES)};
const TECH_CATEGORIES = ${JSON.stringify(TECH_CATEGORIES)};
const BOOK_TECH_MAP = ${JSON.stringify(BOOK_TECH_MAP)};

// ===== STATE =====
let state = {
  tab: 'books', // books | tech | stats
  view: 'list', // list | detail
  search: '',
  categoryFilter: null,
  sectionFilter: null,
  formatFilter: null,
  techCategoryFilter: null,
  favorites: JSON.parse(localStorage.getItem('tl_favorites') || '[]'),
  read: JSON.parse(localStorage.getItem('tl_read') || '[]'),
  notes: JSON.parse(localStorage.getItem('tl_notes') || '{}'),
  techFavorites: JSON.parse(localStorage.getItem('tl_tech_favorites') || '[]'),
  selectedBook: null,
  selectedTech: null,
  sort: 'title'
};

function saveState() {
  localStorage.setItem('tl_favorites', JSON.stringify(state.favorites));
  localStorage.setItem('tl_read', JSON.stringify(state.read));
  localStorage.setItem('tl_notes', JSON.stringify(state.notes));
  localStorage.setItem('tl_tech_favorites', JSON.stringify(state.techFavorites));
}

function esc(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }
function quitarAcentos(s) { return s.normalize('NFD').replace(/\\p{Diacritic}/gu,'').toLowerCase(); }
function seccionInfo(id) { return SECCIONES.find(s=>s.id===id)||{titulo:id,descripcion:'',categoria:''}; }
function categoriaInfo(id) { return CATEGORIAS.find(c=>c.id===id)||{nombre:id}; }
function countByCategory(catId) { return SECCIONES.filter(s=>s.categoria===catId).reduce((a,s)=>a+LIBROS.filter(l=>l.seccion===s.id).length,0); }
function countBySection(secId) { return LIBROS.filter(l=>l.seccion===secId).length; }
function isFav(i){return state.favorites.includes(i)}
function isRead(i){return state.read.includes(i)}
function isTechFav(s){return state.techFavorites.includes(s)}

function toggleFav(i,e){e&&e.stopPropagation();const x=state.favorites.indexOf(i);if(x>=0)state.favorites.splice(x,1);else state.favorites.push(i);saveState();render()}
function toggleRead(i,e){e&&e.stopPropagation();const x=state.read.indexOf(i);if(x>=0)state.read.splice(x,1);else state.read.push(i);saveState();render()}
function toggleTechFav(s,e){e&&e.stopPropagation();const x=state.techFavorites.indexOf(s);if(x>=0)state.techFavorites.splice(x,1);else state.techFavorites.push(s);saveState();render()}
function toggleNotes(i,e){e&&e.stopPropagation();const c=document.querySelector('[data-book="'+i+'"] .card-notes');if(c)c.classList.toggle('visible')}
function saveNote(i,t){state.notes[i]=t;saveState()}

// ===== FILTERING =====
function getFilteredBooks() {
  let books = LIBROS.map((b,i)=>({...b,_idx:i}));
  if(state.search){const terms=quitarAcentos(state.search).split(/\\s+/).filter(Boolean);books=books.filter(b=>{const t=quitarAcentos(b.titulo),a=b.autor?quitarAcentos(b.autor):'',s=quitarAcentos(seccionInfo(b.seccion).titulo);return terms.every(x=>t.includes(x)||a.includes(x)||s.includes(x));})}
  if(state.categoryFilter){const ids=SECCIONES.filter(s=>s.categoria===state.categoryFilter).map(s=>s.id);books=books.filter(b=>ids.includes(b.seccion))}
  if(state.sectionFilter)books=books.filter(b=>b.seccion===state.sectionFilter);
  if(state.formatFilter){if(state.formatFilter==='none')books=books.filter(b=>!b.formato);else books=books.filter(b=>b.formato&&quitarAcentos(b.formato).includes(quitarAcentos(state.formatFilter)))}
  books.sort((a,b)=>{if(state.sort==='author')return(a.autor||'zzz').localeCompare(b.autor||'zzz','es');if(state.sort==='section')return a.seccion.localeCompare(b.seccion)||a.titulo.localeCompare(b.titulo,'es');return a.titulo.localeCompare(b.titulo,'es')});
  return books;
}

function getFilteredTech() {
  let tech = [...TECHNOLOGIES];
  if(state.search){const terms=quitarAcentos(state.search).split(/\\s+/).filter(Boolean);tech=tech.filter(t=>{const ti=quitarAcentos(t.title),ta=t.tags.join(' '),cat=quitarAcentos(t.categoryName);return terms.every(x=>ti.includes(x)||ta.includes(x)||cat.includes(x))})}
  if(state.techCategoryFilter)tech=tech.filter(t=>t.category===state.techCategoryFilter);
  return tech;
}

// ===== SIDEBAR =====
function renderSidebar() {
  const nav=document.getElementById('sidebarNav');
  let h='<div class="nav-section">';
  h+='<div class="nav-item'+(state.tab==='books'?' active':'')+'" onclick="switchTab(\'books\')">';
  h+='📚 <span>Libros</span><span class="count">'+LIBROS.length+'</span></div>';
  h+='<div class="nav-item'+(state.tab==='tech'?' active':'')+'" onclick="switchTab(\'tech\')">';
  h+='⚡ <span>Tecnologías</span><span class="count">'+TECHNOLOGIES.length+'</span></div>';
  h+='<div class="nav-item'+(state.tab==='stats'?' active':'')+'" onclick="switchTab(\'stats\')">';
  h+='📊 <span>Estadísticas</span></div>';
  h+='</div>';

  if(state.tab==='books'){
    h+='<div class="nav-section"><div class="nav-section-title">Categorías</div>';
    CATEGORIAS.forEach(c=>{const n=countByCategory(c.id);h+='<div class="nav-item'+(state.categoryFilter===c.id?' active':'')+'" onclick="filterCat(\''+c.id+'\')"><span>'+c.nombre+'</span><span class="count">'+n+'</span></div>'});
    h+='</div>';
    if(state.categoryFilter){const secs=SECCIONES.filter(s=>s.categoria===state.categoryFilter);h+='<div class="nav-section"><div class="nav-section-title">Secciones</div>';secs.forEach(s=>{const n=countBySection(s.id);h+='<div class="nav-item'+(state.sectionFilter===s.id?' active':'')+'" onclick="filterSec(\''+s.id+'\')"><span>'+s.titulo+'</span><span class="count">'+n+'</span></div>'});h+='</div>'}
  }
  if(state.tab==='tech'){
    h+='<div class="nav-section"><div class="nav-section-title">Categorías</div>';
    Object.entries(TECH_CATEGORIES).forEach(([k,v])=>{const n=TECHNOLOGIES.filter(t=>t.category===k).length;if(n>0)h+='<div class="nav-item'+(state.techCategoryFilter===k?' active':'')+'" onclick="filterTechCat(\''+k+'\')"><span>'+v.icon+' '+v.nombre+'</span><span class="count">'+n+'</span></div>'});
    h+='</div>';
  }
  nav.innerHTML=h;
}

function renderFilterPills() {
  const c=document.getElementById('filterPills');
  let h='';
  if(state.tab==='books'){
    ['PDF','HTML','eBook'].forEach(f=>{h+='<button class="pill book-pill'+(state.formatFilter===f?' active':'')+'" onclick="filterFmt(\''+f+'\')">'+f+'</button>'});
    h+='<button class="pill'+(state.sort==='title'?' active':'')+'" onclick="setSort(\'title\')">A-Z</button>';
    h+='<button class="pill'+(state.sort==='author'?' active':'')+'" onclick="setSort(\'author\')">Autor</button>';
  }
  c.innerHTML=h;
}

// ===== CARD RENDERERS =====
function renderBookCard(b,idx) {
  const sec=seccionInfo(b.seccion),cat=categoriaInfo(sec.categoria);
  const related=LIBROS.filter(l=>l.seccion===b.seccion&&LIBROS.indexOf(l)!==idx).slice(0,3);
  const techLinks=(BOOK_TECH_MAP[b.seccion]||[]).filter(Boolean).slice(0,3);
  let h='<div class="card" data-book="'+idx+'" onclick="openBook('+idx+')">';
  h+='<div class="card-header"><div class="card-title">'+esc(b.titulo)+'</div></div>';
  if(b.autor)h+='<div class="card-subtitle">'+esc(b.autor)+'</div>';
  h+='<div class="card-meta">';
  if(b.formato)h+='<span class="badge badge-format">'+esc(b.formato)+'</span>';
  h+='<span class="badge badge-section">'+esc(sec.titulo)+'</span>';
  h+='</div>';
  if(techLinks.length>0){h+='<div class="tag-list">';techLinks.forEach(t=>{const ti=TECHNOLOGIES.find(x=>x.slug===t);if(ti)h+='<span class="tag" onclick="event.stopPropagation();openTech(\''+t+'\')" style="cursor:pointer" title="Ver docs de '+esc(ti.title)+'">⚡ '+esc(ti.title)+'</span>'});h+='</div>'}
  h+='<div class="card-actions">';
  h+='<button class="btn-fav'+(isFav(idx)?' active':'')+'" onclick="toggleFav('+idx+',event)">'+(isFav(idx)?'⭐':'☆')+' Fav</button>';
  h+='<button class="btn-read'+(isRead(idx)?' active':'')+'" onclick="toggleRead('+idx+',event)">'+(isRead(idx)?'✅':'📖')+' Leer</button>';
  h+='<button onclick="toggleNotes('+idx+',event)">📝</button>';
  h+='</div>';
  const note=state.notes[idx]||'';
  h+='<div class="card-notes'+(note?' visible':'')+'"><textarea placeholder="Nota..." onclick="event.stopPropagation()" onblur="saveNote('+idx+',this.value)">'+esc(note)+'</textarea></div>';
  if(related.length>0){h+='<div class="related">📚 ';related.forEach(r=>{const ri=LIBROS.indexOf(r);h+='<a href="javascript:void(0)" onclick="openBook('+ri+');event.stopPropagation()">'+esc(r.titulo.substring(0,25))+'</a>'});h+='</div>'}
  h+='</div>';return h;
}

function renderTechCard(t) {
  const catInfo=TECH_CATEGORIES[t.category]||{icon:'📦',color:'#6366f1'};
  let h='<div class="card" onclick="openTech(\''+t.slug+'\')">';
  h+='<div class="card-header"><div class="card-title">'+catInfo.icon+' '+esc(t.title)+'</div></div>';
  if(t.version&&t.version!=='-')h+='<div class="card-subtitle">v'+esc(t.version)+'</div>';
  h+='<div class="card-meta">';
  h+='<span class="badge badge-tech">'+esc(t.categoryName)+'</span>';
  h+='</div>';
  h+='<div class="tag-list">';t.tags.forEach(tag=>h+='<span class="tag">'+esc(tag)+'</span>');h+='</div>';
  h+='<div class="card-actions">';
  h+='<button class="btn-fav'+(isTechFav(t.slug)?' active':'')+'" onclick="toggleTechFav(\''+t.slug+'\',event)">'+(isTechFav(t.slug)?'⭐':'☆')+' Fav</button>';
  h+='</div></div>';return h;
}

// ===== VIEWS =====
function renderBooksView() {
  const books=getFilteredBooks();
  let h='';
  if(!state.search&&!state.categoryFilter&&!state.sectionFilter&&!state.formatFilter){
    h+='<div class="stats-grid">';
    h+='<div class="stat-card"><div class="stat-value">'+LIBROS.length+'</div><div class="stat-label">Libros</div></div>';
    h+='<div class="stat-card"><div class="stat-value">'+SECCIONES.length+'</div><div class="stat-label">Secciones</div></div>';
    h+='<div class="stat-card"><div class="stat-value">'+state.favorites.length+'</div><div class="stat-label">Favoritos</div></div>';
    h+='<div class="stat-card"><div class="stat-value">'+state.read.length+'</div><div class="stat-label">Leídos</div></div>';
    h+='</div>';
  }
  h+='<div class="books-grid">';
  if(books.length===0)h+='<div class="empty-state"><div class="icon">📭</div><p>Sin resultados</p></div>';
  else books.forEach(b=>{h+=renderBookCard(b,b._idx)});
  h+='</div>';return h;
}

function renderTechView() {
  const tech=getFilteredTech();
  let h='<div class="tech-grid">';
  if(tech.length===0)h+='<div class="empty-state"><div class="icon">📭</div><p>Sin resultados</p></div>';
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
  CATEGORIAS.forEach(c=>{const n=countByCategory(c.id);h+='<div class="stat-card" onclick="switchTab(\'books\');filterCat(\''+c.id+'\')"><div class="stat-value">'+n+'</div><div class="stat-label">'+c.nombre+'</div></div>'});
  h+='</div>';

  h+='<h3 style="margin:24px 0 12px;color:var(--text-secondary)">Tech por Categoría</h3>';
  h+='<div class="stats-grid">';
  Object.entries(TECH_CATEGORIES).forEach(([k,v])=>{const n=TECHNOLOGIES.filter(t=>t.category===k).length;if(n>0)h+='<div class="stat-card" onclick="switchTab(\'tech\');filterTechCat(\''+k+'\')"><div class="stat-value">'+n+'</div><div class="stat-label">'+v.icon+' '+v.nombre+'</div></div>'});
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
  const sameCat=LIBROS.filter(l=>{const s=seccionInfo(l.seccion);return s.categoria===sec.categoria&&l.seccion!==b.seccion}).slice(0,6);
  const techLinks=(BOOK_TECH_MAP[b.seccion]||[]).filter(Boolean);

  let h='<div class="book-detail">';
  h+='<button onclick="goBack()" style="margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">← Volver</button>';
  h+='<h2>'+esc(b.titulo)+'</h2>';
  if(b.autor)h+='<p style="color:var(--text-secondary)">por '+esc(b.autor)+'</p>';
  h+='<div class="detail-meta">';
  if(b.formato)h+='<span class="badge badge-format">'+esc(b.formato)+'</span>';
  h+='<span class="badge badge-section">'+esc(sec.titulo)+'</span>';
  h+='<span class="badge badge-category">'+esc(cat.nombre)+'</span>';
  h+='</div>';
  h+='<p class="detail-desc">'+esc(sec.descripcion)+'</p>';

  if(techLinks.length>0){h+='<div style="margin:16px 0"><h3 style="font-size:0.9rem;margin-bottom:8px">⚡ Tecnologías relacionadas</h3><div style="display:flex;gap:8px;flex-wrap:wrap">';techLinks.forEach(t=>{const ti=TECHNOLOGIES.find(x=>x.slug===t);if(ti)h+='<button onclick="openTech(\''+t+'\')" style="padding:6px 14px;border-radius:20px;font-size:0.8rem;border:1px solid var(--primary);color:var(--primary);background:var(--primary-glow)">'+esc(ti.title)+'</button>'});h+='</div></div>'}

  h+='<div class="detail-actions">';
  h+='<a href="'+esc(b.url)+'" target="_blank" rel="noopener" class="btn-primary">🔗 Abrir recurso</a>';
  h+='<button onclick="toggleFav('+idx+')" style="border:1px solid var(--border)">'+(isFav(idx)?'⭐ Favorito':'☆ Favorito')+'</button>';
  h+='<button onclick="toggleRead('+idx+')" style="border:1px solid var(--border)">'+(isRead(idx)?'✅ Leído':'📖 Marcar leído')+'</button>';
  h+='</div>';

  const note=state.notes[idx]||'';
  h+='<div style="margin-top:20px"><h3 style="font-size:0.95rem;margin-bottom:8px">📝 Mi Nota</h3>';
  h+='<textarea style="width:100%;min-height:80px;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;color:var(--text)" placeholder="Escribe tu nota..." onblur="saveNote('+idx+',this.value)">'+esc(note)+'</textarea></div>';

  if(related.length>0){h+='<div class="related-section"><h3>📚 Otros en '+esc(sec.titulo)+'</h3><div class="books-grid">';related.forEach(r=>{h+=renderBookCard(r,LIBROS.indexOf(r))});h+='</div></div>'}
  if(sameCat.length>0){h+='<div class="related-section"><h3>🏷️ Más de '+esc(cat.nombre)+'</h3><div class="books-grid">';sameCat.slice(0,4).forEach(l=>{h+=renderBookCard(l,LIBROS.indexOf(l))});h+='</div></div>'}
  h+='</div>';return h;
}

function renderTechDetail(slug) {
  const t=TECHNOLOGIES.find(x=>x.slug===slug);if(!t)return'<p>No encontrada</p>';
  const catInfo=TECH_CATEGORIES[t.category]||{icon:'📦',color:'#6366f1'};
  const relatedBooks=LIBROS.filter(l=>(BOOK_TECH_MAP[l.seccion]||[]).includes(slug)).slice(0,6);

  let h='<div class="tech-detail">';
  h+='<button onclick="goBack()" style="margin-bottom:16px;font-size:0.8rem;color:var(--text-muted)">← Volver</button>';
  h+='<h2>'+catInfo.icon+' '+esc(t.title)+'</h2>';
  if(t.version&&t.version!=='-')h+='<p style="color:var(--text-secondary)">Versión: '+esc(t.version)+'</p>';
  h+='<div class="detail-meta"><span class="badge badge-tech">'+esc(t.categoryName)+'</span></div>';
  h+='<div class="tag-list" style="margin:12px 0">';t.tags.forEach(tag=>h+='<span class="tag">'+esc(tag)+'</span>');h+='</div>';

  h+='<div class="detail-actions">';
  h+='<button onclick="toggleTechFav(\''+t.slug+'\')" style="border:1px solid var(--border)">'+(isTechFav(t.slug)?'⭐ Favorito':'☆ Favorito')+'</button>';
  h+='</div>';

  // Render content sections
  h+='<div class="tech-content">';
  t.sections.forEach(s=>{
    h+='<h3>'+esc(s.title)+'</h3>';
    const lines=s.content.split('\n');
    const bt=String.fromCharCode(96); // backtick
    lines.forEach(line=>{
      const trimmed=line.trimStart();
      if(trimmed.indexOf(bt+bt+bt)===0){h+='<pre><code>'}
      else if(line.startsWith('- '))h+='<li>'+esc(line.substring(2))+'</li>';
      else if(line.startsWith('# ')){}
      else if(line.trim())h+='<p>'+esc(line)+'</p>';
    });
  });
  h+='</div>';

  if(relatedBooks.length>0){h+='<div class="related-section"><h3>📚 Libros relacionados</h3><div class="books-grid">';relatedBooks.forEach(b=>{h+=renderBookCard(b,LIBROS.indexOf(b))});h+='</div></div>'}
  h+='</div>';return h;
}

// ===== NAVIGATION =====
function switchTab(tab){state.tab=tab;state.view='list';state.categoryFilter=null;state.sectionFilter=null;state.formatFilter=null;state.techCategoryFilter=null;state.selectedBook=null;state.selectedTech=null;render();renderSidebar();renderFilterPills()}
function openBook(i){state.view='detail';state.selectedBook=i;state.tab='books';render();window.scrollTo(0,0)}
function openTech(s){state.view='detail';state.selectedTech=s;state.tab='tech';render();window.scrollTo(0,0)}
function goBack(){state.view='list';state.selectedBook=null;state.selectedTech=null;render();renderSidebar()}
function filterCat(id){state.categoryFilter=state.categoryFilter===id?null:id;state.sectionFilter=null;state.tab='books';state.view='list';render();renderSidebar()}
function filterSec(id){state.sectionFilter=state.sectionFilter===id?null:id;if(state.sectionFilter)state.categoryFilter=seccionInfo(id).categoria;state.tab='books';state.view='list';render();renderSidebar()}
function filterFmt(f){state.formatFilter=state.formatFilter===f?null:f;render();renderFilterPills()}
function filterTechCat(k){state.techCategoryFilter=state.techCategoryFilter===k?null:k;state.tab='tech';state.view='list';render();renderSidebar()}
function setSort(s){state.sort=s;render();renderFilterPills()}
function clearAll(){state.search='';state.categoryFilter=null;state.sectionFilter=null;state.formatFilter=null;state.techCategoryFilter=null;document.getElementById('searchInput').value='';render();renderSidebar();renderFilterPills()}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('visible')}
function exportData(){const d={favorites:state.favorites,read:state.read,notes:state.notes,techFavorites:state.techFavorites};const b=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='tech-library-backup.json';a.click();URL.revokeObjectURL(u)}

function render(){
  const c=document.getElementById('content');
  let h='';
  if(state.view==='detail'&&state.selectedBook!==null)h=renderBookDetail(state.selectedBook);
  else if(state.view==='detail'&&state.selectedTech)h=renderTechDetail(state.selectedTech);
  else if(state.tab==='books')h=renderBooksView();
  else if(state.tab==='tech')h=renderTechView();
  else if(state.tab==='stats')h=renderStatsView();
  c.innerHTML=h;
  const count=state.tab==='books'?getFilteredBooks().length:state.tab==='tech'?getFilteredTech().length:'-';
  document.getElementById('resultCount').textContent=count+(state.tab!=='stats'?' / '+(state.tab==='books'?LIBROS.length:TECHNOLOGIES.length):'');
}

// ===== EVENTS =====
let searchTimeout;
document.getElementById('searchInput').addEventListener('input',e=>{clearTimeout(searchTimeout);searchTimeout=setTimeout(()=>{state.search=e.target.value;state.view='list';render()},200)});
document.addEventListener('keydown',e=>{
  if((e.ctrlKey&&e.key==='k')||(e.key==='/'&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA')){e.preventDefault();document.getElementById('searchInput').focus()}
  if(e.key==='Escape'){document.getElementById('searchInput').blur();if(state.search)clearAll()}
  if(e.key==='1'&&!e.ctrlKey&&document.activeElement.tagName!=='INPUT')switchTab('books');
  if(e.key==='2'&&!e.ctrlKey&&document.activeElement.tagName!=='INPUT')switchTab('tech');
});
document.getElementById('overlay').addEventListener('click',toggleSidebar);

// ===== INIT =====
renderSidebar();renderFilterPills();render();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf8');
console.log('Generated: tech-library/index.html');
console.log('Size:', (Buffer.byteLength(html)/1024).toFixed(1), 'KB');
console.log('Books:', LIBROS.length, '| Tech:', TECHNOLOGIES.length, '| Sections:', SECCIONES.length);
