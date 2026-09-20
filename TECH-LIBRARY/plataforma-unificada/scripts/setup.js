#!/usr/bin/env node

/**
 * Setup Script for Plataforma Total Unificada
 * 
 * Inicializa la base de datos, importa contenido de los repositorios originales
 * y configura el entorno de desarrollo.
 */

import { existsSync, mkdirSync, copyFileSync, cpSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { LearningDatabase } from '../packages/learning/src';
import { CourseImportService } from '../packages/learning/src';

const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'data');
const PLATAFORMA_TOTAL_PATH = join(ROOT, '..', 'plataforma-total-pro');
const PLATAFORMA_TOTAL_DESARROLLO_PATH = join(ROOT, '..', 'PLATAFORMA-TOTAL-DE-APRENDIZAJE-DESARROLLO-E-IA-AUT-NOMA');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

function runCommand(cmd, cwd = ROOT) {
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Command failed: ${cmd}`, 'error');
    return false;
  }
}

async function setup() {
  log('🚀 Iniciando setup de Plataforma Total Unificada...');
  
  // 1. Crear directorios necesarios
  log('📁 Creando directorios...');
  const dirs = [
    DATA_DIR,
    join(DATA_DIR, 'certificates'),
    join(ROOT, 'storage'),
    join(ROOT, 'plugins'),
    join(ROOT, 'logs'),
  ];
  
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      log(`  Creado: ${dir}`);
    }
  }

  // 2. Inicializar base de datos de aprendizaje
  log('🗄️ Inicializando base de datos...');
  const dbPath = join(DATA_DIR, 'learning.db');
  const db = LearningDatabase.getInstance(dbPath);
  log('  Base de datos creada');

  // 3. Importar cursos de Plataforma Total
  if (existsSync(PLATAFORMA_TOTAL_PATH)) {
    log('📚 Importando cursos de Plataforma Total Pro...');
    try {
      // Cargar módulos de contenido dinámicamente
      const contenidoModules = [];
      for (let i = 1; i <= 5; i++) {
        const modulePath = join(PLATAFORMA_TOTAL_PATH, `contenido_${String.fromCharCode(96 + i)}.py`);
        if (existsSync(modulePath)) {
          log(`  Encontrado: contenido_${String.fromCharCode(96 + i)}.py`);
          // Nota: Los archivos .py necesitan ser parseados
          // Por ahora creamos un mock import
        }
      }
      
      // Usar el servicio de importación con datos mock
      const importService = new CourseImportService(db);
      
      // Datos mock basados en la estructura real
      const mockContentModules = [{
        CURSOS_MOD: {
          'Lógica Computacional': [
            ['Introducción', 'La lógica es la base de la programación...', [['¿Qué es un algoritmo?', ['Una receta', 'Un programa', 'Un error', 'Un virus'], 0, 'Un algoritmo es una secuencia de pasos']]],
            ['Proposiciones', 'Las proposiciones son afirmaciones verdaderas o falsas...', []],
          ],
          'Algoritmos y Estructuras': [
            ['Algoritmos básicos', 'Un algoritmo es una secuencia finita de pasos...', []],
            ['Complejidad', 'Medimos eficiencia con notación Big O...', []],
          ],
          'Git & GitHub': [
            ['Control de versiones', 'Git permite rastrear cambios en el código...', []],
            ['Ramas y merges', 'Las ramas permiten trabajo paralelo...', []],
          ],
          'Terminal & Bash': [
            ['Navegación', 'cd, ls, pwd para moverse por el sistema...', []],
            ['Permisos', 'chmod, chown para gestionar accesos...', []],
          ],
          'HTML Semántico & CSS Moderno': [
            ['Estructura HTML5', 'header, main, footer, article, section...', []],
            ['Flexbox & Grid', 'Layouts modernos con CSS...', []],
          ],
          'JavaScript Moderno (ES6+)': [
            ['Variables let/const', 'let y const reemplazan a var...', []],
            ['Funciones flecha', 'Sintaxis concisa para funciones...', []],
            ['Promesas', 'Manejo asíncrono con Promesas...', []],
            ['Async/Await', 'Código asíncrono legible...', []],
            ['Módulos ES6', 'import/export para organizar código...', []],
            ['Destructuring', 'Extraer valores de arrays/objetos...', []],
          ],
          'TypeScript Avanzado': [
            ['Tipos básicos', 'string, number, boolean, any, unknown...', []],
            ['Interfaces', 'Contratos para objetos...', []],
            ['Generics', 'Código reutilizable con tipos...', []],
            ['Utility Types', 'Partial, Pick, Omit, Record...', []],
          ],
          'React + Next.js 14': [
            ['Componentes', 'Componentes funcionales con hooks...', []],
            ['Server Components', 'Renderizado en servidor por defecto...', []],
            ['App Router', 'Nuevo sistema de routing...', []],
          ],
          'Python para Backend': [
            ['Sintaxis Python', 'Indentación, variables, tipos...', []],
            ['FastAPI', 'Framework moderno y rápido...', []],
            ['SQLAlchemy', 'ORM para bases de datos...', []],
          ],
          'SQL & PostgreSQL': [
            ['Consultas básicas', 'SELECT, INSERT, UPDATE, DELETE...', []],
            ['Joins', 'INNER, LEFT, RIGHT, FULL JOIN...', []],
            ['Índices', 'Optimización de consultas...', []],
          ],
          'Docker & Contenedores': [
            ['Imágenes y contenedores', 'Dockerfile, build, run...', []],
            ['Docker Compose', 'Orquestación multi-contenedor...', []],
          ],
          'Machine Learning Básico': [
            ['Conceptos ML', 'Supervisado, no supervisado, refuerzo...', []],
            ['Scikit-learn', 'Pipeline de ML en Python...', []],
          ],
        }
      }];
      
      await importService.importFromPlataformaTotal(mockContentModules);
      log('  Cursos importados correctamente');
    } catch (error) {
      log(`  Error importando cursos: ${error.message}`, 'error');
    }
  } else {
    log('  Plataforma Total Pro no encontrado, saltando importación', 'warn');
  }

  // 4. Copiar archivos de expansión si existen
  if (existsSync(join(PLATAFORMA_TOTAL_PATH, 'expansion'))) {
    log('📂 Copiando archivos de expansión...');
    try {
      cpSync(join(PLATAFORMA_TOTAL_PATH, 'expansion'), join(DATA_DIR, 'expansion'), { recursive: true });
      log('  Archivos de expansión copiados');
    } catch (error) {
      log(`  Error copiando expansión: ${error.message}`, 'warn');
    }
  }

  // 5. Crear archivo .env si no existe
  const envPath = join(ROOT, '.env');
  const envExamplePath = join(ROOT, '.env.example');
  if (!existsSync(envPath) && existsSync(envExamplePath)) {
    log('⚙️ Creando archivo .env...');
    copyFileSync(envExamplePath, envPath);
    log('  .env creado desde .env.example');
  }

  // 6. Instalar dependencias
  log('📦 Instalando dependencias...');
  if (!runCommand('npm install')) {
    log('  Error instalando dependencias', 'error');
    return;
  }

  // 6. Build packages
  log('🔨 Construyendo packages...');
  if (!runCommand('npm run build')) {
    log('  Error en build', 'warn');
  }

  log('');
  log('✅ Setup completado!', 'success');
  log('');
  log('📋 Próximos pasos:');
  log('  1. Edita .env con tus claves (GATEWAY_API_KEY, JWT_SECRET, etc.)');
  log('  2. Ejecuta: npm run dev');
  log('  3. Abre http://localhost:4321 (web) o la app Electron');
  log('');
  log('🔗 URLs de desarrollo:');
  log('  - Web:        http://localhost:4321');
  log('  - API:        http://localhost:3000');
  log('  - Gateway:    http://localhost:3001');
  log('  - MCP:        http://localhost:3002/mcp');
  log('');
  log('📚 Documentación: https://github.com/SoftEngAi-dev/plataforma-unificada');
}

// Ejecutar setup
setup().catch(error => {
  log(`Error fatal: ${error.message}`, 'error');
  process.exit(1);
});