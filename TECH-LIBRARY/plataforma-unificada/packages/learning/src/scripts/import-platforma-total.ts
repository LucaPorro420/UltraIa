/**
 * Import script to migrate content from Plataforma Total repositories
 * Run with: npm run import:platforma-total
 */

import { CourseImportService } from '../index';
import { LearningDatabase } from '../index';
import { createLearningServices } from '../index';

// Import the original content modules
// These would be copied from plataforma-total-pro/contenido_*.py
// For now, we'll create a mock import

async function main() {
  console.log('🚀 Starting Plataforma Total content import...');
  
  const dbPath = join(process.cwd(), 'data', 'learning.db');
  const { db, importService } = createLearningServices(dbPath);
  
  // In production, you would import the actual content modules:
  // import contenido_a from 'plataforma-total-pro/contenido_a';
  // import contenido_b from 'plataforma-total-pro/contenido_b';
  // etc.
  
  // Mock content structure for demonstration
  const mockContentModules = [
    {
      CURSOS_MOD: {
        'Fundamentos de Programación': [
          ['Variables y Tipos', 'Las variables guardan valores...', [['¿Qué es una variable?', ['Un contenedor', 'Una función', 'Un bucle', 'Un error'], 0, 'Una variable es un contenedor para guardar datos']]],
          ['Condicionales', 'Los if/else permiten tomar decisiones...', [['¿Para qué sirve if?', ['Repetir código', 'Tomar decisiones', 'Definir funciones', 'Importar módulos'], 1, 'if evalúa una condición y ejecuta código si es verdadera']]],
        ],
        'JavaScript Moderno': [
          ['ES6 Variables', 'let y const reemplazan a var...', []],
          ['Arrow Functions', 'Sintaxis flecha para funciones...', []],
          ['Promesas', 'Manejo asíncrono con Promesas...', []],
        ],
        'Python Básico': [
          ['Sintaxis Python', 'Indentación y variables...', []],
          ['Listas y Diccionarios', 'Estructuras de datos...', []],
        ],
      }
    }
  ];
  
  try {
    const imported = await importService.importFromPlataformaTotal(mockContentModules);
    console.log(`✅ Import completed! ${imported} courses imported.`);
    
    // Verify import
    const courses = db.getAllCourses();
    console.log(`\n📚 Total courses in database: ${courses.length}`);
    for (const course of courses.slice(0, 5)) {
      console.log(`  - ${course.title} (${course.level}) - ${course.lessons?.length || 0} lessons`);
    }
    if (courses.length > 5) {
      console.log(`  ... and ${courses.length - 5} more`);
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run if executed directly
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as importPlataformaTotal };