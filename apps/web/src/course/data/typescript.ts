import type { Framework } from '../types';

export const typescript: Framework = {
  id: 'typescript',
  name: 'TypeScript',
  category: 'language',
  icon: '🟦',
  color: '#3178c6',
  tagline: 'JavaScript con tipos estáticos para código robusto.',
  description:
    'TypeScript añade un sistema de tipos a JavaScript, detectando errores en tiempo de compilación. Esencial para proyectos grandes y los frameworks modernos.',
  modules: [
    {
      id: 'typescript-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Tipos básicos y configuración.',
      lessons: [
        {
          id: 'typescript-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Inicializa TypeScript y tsconfig.',
          topics: ['tsc', 'tsconfig', 'compile'],
          content:
            `Instala typescript y crea tsconfig.json con 'npx tsc --init'.\n\nCompila con 'npx tsc' y ejecuta el JS resultante con node.`,
          examples: [
            {
              lang: 'bash',
              code: `npm install -D typescript
npx tsc --init
npx tsc && node dist/index.js`,
              caption: 'Compilar TypeScript.',
            },
          ],
        },
        {
          id: 'typescript-types',
          title: 'Tipos primitivos',
          level: 'basico',
          durationMin: 25,
          summary: 'Anota variables con tipos.',
          topics: ['string', 'number', 'boolean'],
          content:
            `Anota con : string, : number o : boolean para seguridad.\n\nTypeScript infiere tipos cuando no los escribes.`,
          examples: [
            {
              lang: 'ts',
              code: `const nombre: string = 'Ana';
const edad: number = 30;
const activo: boolean = true;
function saludar(n: string): string {
  return 'Hola ' + n;
}`,
              caption: 'Anotaciones de tipos.',
            },
          ],
        },
        {
          id: 'typescript-arrays',
          title: 'Arrays y objetos',
          level: 'basico',
          durationMin: 20,
          summary: 'Estructuras con tipos.',
          topics: ['array', 'object', 'type'],
          content:
            `Usa number[] o Array<number> para arreglos tipados.\n\nDefine formas de objeto con type o interface.`,
          examples: [
            {
              lang: 'ts',
              code: `type Usuario = { id: number; nombre: string };
const usuarios: Usuario[] = [{ id: 1, nombre: 'Ana' }];
function nombreDe(u: Usuario): string {
  return u.nombre;
}`,
              caption: 'Objetos tipados con type.',
            },
          ],
        },
      ],
    },
    {
      id: 'typescript-intermedio',
      title: 'Tipos compuestos',
      level: 'intermedio',
      summary: 'Uniones, genéricos y funciones.',
      lessons: [
        {
          id: 'typescript-union',
          title: 'Uniones e interfaces',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Modela datos flexibles.',
          topics: ['union', 'interface', 'literal'],
          content:
            `Las uniones (A | B) permiten múltiples formas válidas.\n\ninterface es extensible y útil para contratos de API.`,
          examples: [
            {
              lang: 'ts',
              code: `interface Resultado {
  ok: boolean;
  datos?: string[];
}
function procesar(r: Resultado): string {
  return r.ok ? (r.datos?.length ?? 0) + ' items' : 'fallo';
}`,
              caption: 'Interface con propiedad opcional.',
            },
          ],
        },
        {
          id: 'typescript-generics',
          title: 'Genéricos',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Funciones y tipos parametrizados.',
          topics: ['generic', 'T', 'reutilizacion'],
          content:
            `Los genéricos <T> hacen código reutilizable y type-safe.\n\nÚsalos cuando la forma del dato dependa del caller.`,
          examples: [
            {
              lang: 'ts',
              code: `function primero<T>(lista: T[]): T | undefined {
  return lista[0];
}
const a = primero<number>([1, 2, 3]);`,
              caption: 'Función genérica.',
            },
          ],
        },
        {
          id: 'typescript-async',
          title: 'Async y tipos',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Promesas tipadas.',
          topics: ['Promise', 'async', 'await'],
          content:
            `Las funciones async devuelven Promise<T>.\n\nTipa el valor resuelto para autocompletado seguro.`,
          examples: [
            {
              lang: 'ts',
              code: `async function obtenerUsuario(id: number): Promise<{ id: number; nombre: string }> {
  const res = await fetch('/api/usuarios/' + id);
  return res.json();
}`,
              caption: 'Async con tipo de retorno.',
            },
          ],
        },
      ],
    },
    {
      id: 'typescript-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Utility types, narrow y config.',
      lessons: [
        {
          id: 'typescript-utility',
          title: 'Utility types',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Transforma tipos integrados.',
          topics: ['Partial', 'Pick', 'Readonly'],
          content:
            `Partial<T> hace opcionales todas las propiedades; Pick<T, K> selecciona.\n\nEstos ahorran definir tipos derivados a mano.`,
          examples: [
            {
              lang: 'ts',
              code: `interface User { id: number; nombre: string; email: string }
type UserUpdate = Partial<User>;
function actualizar(id: number, cambios: UserUpdate): void {
  console.log(id, cambios);
}`,
              caption: 'Partial para updates.',
            },
          ],
        },
        {
          id: 'typescript-narrow',
          title: 'Type narrowing',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Refina tipos en runtime.',
          topics: ['narrow', 'typeof', 'guard'],
          content:
            `typeof y las type guards refinan el tipo dentro de un bloque.\n\nEsto habilita autocompletado correcto tras el chequeo.`,
          examples: [
            {
              lang: 'ts',
              code: `function procesar(valor: string | number): string {
  if (typeof valor === 'string') {
    return valor.toUpperCase();
  }
  return valor.toFixed(2);
}`,
              caption: 'Narrowing con typeof.',
            },
          ],
        },
        {
          id: 'typescript-config',
          title: 'tsconfig y monorepos',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Configuración avanzada.',
          topics: ['strict', 'paths', 'references'],
          content:
            `En monorepos, tsconfig references permiten builds incrementales entre paquetes. paths mapea alias (@/) a carpetas sin resolución relativa frágil.\n\nUn tsconfig base compartido evita duplicar reglas en cada paquete del workspace.`,
          examples: [
            {
              lang: 'json',
              code: `{
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}`,
              caption: 'tsconfig con strict y paths.',
            },
          ],
        },
      ],
    },
  ],
};
