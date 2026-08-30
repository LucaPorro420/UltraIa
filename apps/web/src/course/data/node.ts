import type { Framework } from '../types';

export const node: Framework = {
  id: 'node',
  name: 'Node.js / Express',
  category: 'backend',
  icon: '🟢',
  color: '#339933',
  tagline: 'JavaScript en el servidor con Express.',
  description:
    'Node.js ejecuta JavaScript fuera del navegador; Express es el framework HTTP más popular. Construye APIs REST, middlewares y servicios escalables.',
  modules: [
    {
      id: 'node-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Entorno Node, módulos y un servidor HTTP.',
      lessons: [
        {
          id: 'node-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Inicializa un proyecto Node con npm.',
          topics: ['npm init', 'package.json', 'type module'],
          content:
            `Inicializa con 'npm init -y'. Usa '"type": "module"' para ESM moderno.\n\nInstala dependencias con 'npm install' y ejecuta con 'node archivo.js'.`,
          examples: [
            {
              lang: 'bash',
              code: `npm init -y
npm pkg set type=module
node index.js`,
              caption: 'Inicializar proyecto Node.',
            },
          ],
        },
        {
          id: 'node-http',
          title: 'Servidor HTTP nativo',
          level: 'basico',
          durationMin: 25,
          summary: 'Crea un servidor con el módulo http.',
          topics: ['http', 'request', 'response'],
          content:
            `El módulo 'http' nativo crea servidores sin dependencias.\n\nResponde con res.end y define el Content-Type adecuado.`,
          examples: [
            {
              lang: 'js',
              code: `import http from 'node:http';
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});
server.listen(3000, () => console.log('En 3000'));`,
              caption: 'Servidor HTTP nativo.',
            },
          ],
        },
        {
          id: 'node-modules',
          title: 'Módulos y fs',
          level: 'basico',
          durationMin: 20,
          summary: 'Importar, leer archivos y paths.',
          topics: ['import', 'fs', 'path'],
          content:
            `Usa 'import' para ESM y el módulo 'fs' para archivos.\n\n'path' construye rutas multiplataforma sin errores.`,
          examples: [
            {
              lang: 'js',
              code: `import fs from 'node:fs/promises';
import path from 'node:path';
const datos = await fs.readFile(path.join('data', 'a.json'), 'utf8');
console.log(datos);`,
              caption: 'Leer archivo con fs/promises.',
            },
          ],
        },
      ],
    },
    {
      id: 'node-intermedio',
      title: 'Express y APIs',
      level: 'intermedio',
      summary: 'Rutas, middlewares y JSON.',
      lessons: [
        {
          id: 'node-express',
          title: 'Express básico',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Primer servidor Express con rutas.',
          topics: ['express', 'routes', 'get'],
          content:
            `Express simplifica el enrutado y los middlewares.\n\napp.get define una ruta GET; req/res son los objetos de petición/respuesta.`,
          examples: [
            {
              lang: 'js',
              code: `import express from 'express';
const app = express();
app.use(express.json());
app.get('/api/hola', (req, res) => res.json({ msg: 'hola' }));
app.listen(3000, () => console.log('API en 3000'));`,
              caption: 'API REST con Express.',
            },
          ],
        },
        {
          id: 'node-middleware',
          title: 'Middlewares',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Lógica compartida entre rutas.',
          topics: ['middleware', 'next', 'auth'],
          content:
            `Un middleware recibe (req, res, next) y puede cortar o continuar.\n\nÚsalo para autenticación, logging o validación.`,
          examples: [
            {
              lang: 'js',
              code: `function logger(req, res, next) {
  console.log(req.method, req.url);
  next();
}
app.use(logger);`,
              caption: 'Middleware de logging.',
            },
          ],
        },
        {
          id: 'node-postgres',
          title: 'Conexión a base de datos',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Consultas con un driver SQL.',
          topics: ['pg', 'pool', 'sql'],
          content:
            `Usa un pool de conexiones para eficiencia.\n\nNunca concatenes SQL: usa parámetros para evitar inyección.`,
          examples: [
            {
              lang: 'js',
              code: `import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [1]);
console.log(rows);`,
              caption: 'Query parametrizada con pg.',
            },
          ],
        },
      ],
    },
    {
      id: 'node-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Streams, errores y estructura.',
      lessons: [
        {
          id: 'node-streams',
          title: 'Streams y archivos',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Procesa datos grandes con streams.',
          topics: ['stream', 'pipe', 'memoria'],
          content:
            `Los streams procesan datos por chunks sin cargar todo en memoria.\n\nIdeal para subir/descargar archivos grandes.`,
          examples: [
            {
              lang: 'js',
              code: `import fs from 'node:fs';
fs.createReadStream('grande.csv')
  .on('data', (chunk) => console.log('chunk', chunk.length))
  .on('end', () => console.log('fin'));`,
              caption: 'Lectura por stream.',
            },
          ],
        },
        {
          id: 'node-errors',
          title: 'Manejo de errores',
          level: 'avanzado',
          durationMin: 25,
          summary: 'try/catch y middleware de error.',
          topics: ['try catch', 'error handler', 'status'],
          content:
            `Envuelve await en try/catch y propaga errores con next(err).\n\nUn middleware de 4 args centraliza la respuesta de error.`,
          examples: [
            {
              lang: 'js',
              code: `app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Interno' });
});`,
              caption: 'Middleware de errores.',
            },
          ],
        },
        {
          id: 'node-structure',
          title: 'Arquitectura escalable',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Separar rutas, servicios y capas.',
          topics: ['layers', 'services', 'clean'],
          content:
            `Separa rutas (controladores), servicios y acceso a datos.\n\nEsto mejora testeo y mantenibilidad a medida que crece la API.`,
          examples: [
            {
              lang: 'js',
              code: `// routes/usuarios.js
import { Router } from 'express';
import { listarUsuarios } from '../services/usuarios.js';
const r = Router();
r.get('/', async (req, res) => res.json(await listarUsuarios()));
export default r;`,
              caption: 'Rutas desacopladas de servicios.',
            },
          ],
        },
      ],
    },
  ],
};
