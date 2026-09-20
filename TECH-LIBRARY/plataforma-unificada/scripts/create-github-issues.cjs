#!/usr/bin/env node
/**
 * Script para crear issues de GitHub basados en el ROADMAP.md
 * Requiere: gh CLI autenticado (gh auth login)
 * Uso: node scripts/create-github-issues.cjs [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const ROADMAP_FILE = path.join(__dirname, '..', 'docs', 'ROADMAP.md');

function parseRoadmap() {
  const content = fs.readFileSync(ROADMAP_FILE, 'utf-8');
  const issues = [];
  
  // Parse tables from markdown
  const tableRegex = /\|\s*Feature\s*\|\s*Descripción\s*\|\s*Estado\s*\|\s*Esfuerzo\s*\|[\s\S]*?(?=\n\n|\n#|\n$)/g;
  const tables = content.match(tableRegex) || [];
  
  for (const table of tables) {
    const rows = table.split('\n').filter(row => row.includes('|') && !row.includes('---') && !row.includes('Feature'));
    for (const row of rows) {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 4) {
        const [feature, description, status, effort] = cells;
        if (feature && !feature.startsWith('|')) {
          issues.push({
            title: `[FEATURE] ${feature.trim()}`,
            body: `## Descripción\n${description.trim()}\n\n## Esfuerzo estimado: ${effort.trim()}\n\n---\n_Generado automáticamente desde ROADMAP.md_`,
            labels: ['feature', 'roadmap'],
            priority: effort.includes('L') ? 'low' : effort.includes('M') ? 'medium' : 'high',
            area: determineArea(feature.trim()),
          });
        }
      }
    }
  }
  
  return issues;
}

function determineArea(feature) {
  const f = feature.toLowerCase();
  if (f.includes('xp') || f.includes('badge') || f.includes('racha') || f.includes('leaderboard') || f.includes('gamif')) return 'Gamificación';
  if (f.includes('ia') || f.includes('tutor') || f.includes('quiz') || f.includes('code review') || f.includes('asistente')) return 'IA Assistant';
  if (f.includes('curso') || f.includes('certif') || f.includes('especializ')) return 'Cursos/Contenido';
  if (f.includes('ide') || f.includes('editor') || f.includes('sandbox')) return 'IDE/Editor';
  if (f.includes('desktop') || f.includes('electron')) return 'Desktop App';
  if (f.includes('web') || f.includes('astro')) return 'Web App';
  if (f.includes('api') || f.includes('integrac') || f.includes('github') || f.includes('cloud')) return 'API/Integraciones';
  if (f.includes('arquitect') || f.includes('seguridad') || f.includes('testing') || f.includes('performance') || f.includes('observab')) return 'DevOps/Infra';
  return 'Otro';
}

function createIssue(issue, dryRun = false) {
  const labels = issue.labels.join(',');
  const cmd = [
    'gh', 'issue', 'create',
    '--title', `"${issue.title}"`,
    '--body', `"${issue.body}"`,
    '--label', `"${labels}"`,
  ].join(' ');
  
  if (dryRun) {
    console.log(`[DRY RUN] ${cmd}`);
    return { success: true, dryRun: true };
  }
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
    console.log(`✅ Created: ${issue.title}`);
    return { success: true, output: output.trim() };
  } catch (error) {
    console.error(`❌ Failed: ${issue.title}`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

function main() {
  console.log('🚀 Creando issues de GitHub desde ROADMAP.md...');
  console.log(`Modo: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
  
  const issues = parseRoadmap();
  console.log(`📋 ${issues.length} issues encontrados en ROADMAP.md\n`);
  
  let created = 0;
  let failed = 0;
  
  for (const issue of issues) {
    const result = createIssue(issue, DRY_RUN);
    if (result.success) created++;
    else failed++;
    
    // Rate limit
    if (!DRY_RUN) {
      require('child_process').execSync('sleep 1', { stdio: 'ignore' });
    }
  }
  
  console.log(`\n📊 Resumen: ${created} creados, ${failed} fallidos`);
  if (DRY_RUN) {
    console.log('\n💡 Ejecuta sin --dry-run para crear los issues realmente');
  }
}

if (require.main === module) {
  main();
}