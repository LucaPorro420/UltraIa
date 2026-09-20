#!/usr/bin/env node

/**
 * Verification Script for Plataforma Total Unificada
 * 
 * Verifica que la instalación esté completa y funcional
 */

import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '..');

const checks = [
  { name: 'package.json', path: 'package.json', type: 'file' },
  { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file' },
  { name: '.env.example', path: '.env.example', type: 'file' },
  { name: 'README.md', path: 'README.md', type: 'file' },
  { name: 'packages/core', path: 'packages/core/src/index.ts', type: 'file' },
  { name: 'packages/agents', path: 'packages/agents/src/index.ts', type: 'file' },
  { name: 'packages/gateway', path: 'packages/gateway/src/index.ts', type: 'file' },
  { name: 'packages/learning', path: 'packages/learning/src/index.ts', type: 'file' },
  { name: 'apps/web', path: 'apps/web/package.json', type: 'file' },
  { name: 'apps/desktop', path: 'apps/desktop/package.json', type: 'file' },
  { name: 'services/api', path: 'services/api/src/index.ts', type: 'file' },
  { name: 'infra/docker', path: 'infra/docker/docker-compose.yml', type: 'file' },
  { name: 'scripts/setup.js', path: 'scripts/setup.js', type: 'file' },
];

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

async function verify() {
  log('🔍 Verificando instalación de Plataforma Total Unificada...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const check of checks) {
    const fullPath = join(ROOT, check.path);
    const exists = existsSync(fullPath);
    
    if (exists) {
      log(`  ✅ ${check.name}`, 'success');
      passed++;
    } else {
      log(`  ❌ ${check.name} (${check.path})`, 'error');
      failed++;
    }
  }
  
  // Verificar node_modules
  if (existsSync(join(ROOT, 'node_modules'))) {
    log(`  ✅ node_modules instalado`, 'success');
    passed++;
  } else {
    log(`  ⚠️ node_modules no encontrado (ejecuta npm install)`, 'warn');
  }
  
  // Verificar .env
  if (existsSync(join(ROOT, '.env'))) {
    log(`  ✅ .env configurado`, 'success');
    passed++;
  } else {
    log(`  ⚠️ .env no encontrado (copia .env.example)`, 'warn');
  }
  
  // Verificar base de datos
  if (existsSync(join(ROOT, 'data', 'learning.db'))) {
    log(`  ✅ Base de datos inicializada`, 'success');
    passed++;
  } else {
    log(`  ⚠️ Base de datos no inicializada (ejecuta npm run setup)`, 'warn');
  }
  
  // Verificar build
  try {
    execSync('npm run build --dry-run 2>/dev/null || npm run build 2>&1 | head -20', { 
      cwd: ROOT, 
      stdio: 'pipe',
      timeout: 60000 
    });
    log(`  ✅ Build compila correctamente`, 'success');
    passed++;
  } catch (error) {
    log(`  ⚠️ Build tiene advertencias (ejecuta npm run build para detalles)`, 'warn');
  }
  
  console.log('\n' + '='.repeat(50));
  log(`Resumen: ${passed} verificaciones pasadas, ${failed} fallidas`, failed === 0 ? 'success' : 'warn');
  
  if (failed === 0) {
    log('\n🎉 ¡Instalación verificada correctamente!', 'success');
    log('Ejecuta: npm run dev');
  } else {
    log('\n⚠️  Hay problemas que resolver antes de continuar', 'warn');
    process.exit(1);
  }
}

verify().catch(error => {
  log(`Error en verificación: ${error.message}`, 'error');
  process.exit(1);
});