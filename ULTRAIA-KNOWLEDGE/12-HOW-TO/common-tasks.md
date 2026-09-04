# HOW-TO — Guías paso a paso para todas las tareas comunes

> **Nivel:** Principiante a avanzado
> **Prerrequisitos:** Node.js 20+, Python 3.10+, npm
> **Categorías:** Páginas, APIs, herramientas, componentes, DB, env, tests, troubleshooting

---

## 1. Agregar una nueva página (route)

### Ejemplo: Crear una página `/pricing`

**Paso 1:** Crear el archivo

```tsx
// apps/web/app/pricing/page.tsx

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas text-text p-8">
      <h1 className="text-4xl font-bold">Precios</h1>
      <p className="mt-4 text-text-secondary">
        Elige el plan perfecto para ti
      </p>
      
      <div className="grid grid-cols-3 gap-8 mt-8">
        {/* Cards de precios aquí */}
      </div>
    </div>
  );
}
```

**Paso 2:** Verificar

```bash
npm run dev
# Abrir http://localhost:3000/pricing
```

¡Listo! Next.js App Router crea la ruta automáticamente.

---

## 2. Agregar una nueva API route

### Ejemplo: Crear `/api/products`

**Paso 1:** Crear el archivo

```typescript
// apps/web/app/api/products/route.ts

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server/context';
import { prisma } from '@ultraia/core';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const products = await prisma.generatedAsset.findMany({
    where: { type: 'product' },
  });
  
  return NextResponse.json({ data: products });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const body = await request.json();
  
  const product = await prisma.generatedAsset.create({
    data: {
      type: 'product',
      url: body.url,
      prompt: body.prompt,
      metadata: JSON.stringify(body.metadata),
    },
  });
  
  return NextResponse.json({ data: product }, { status: 201 });
}
```

**Paso 2:** Probar

```bash
# GET
curl http://localhost:3000/api/products

# POST
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ejemplo.com/producto.png", "prompt": "Producto"}'
```

---

## 3. Agregar una nueva herramienta para la IA

### Ejemplo: Crear herramienta `calculator`

**Paso 1:** Crear el archivo

```typescript
// packages/core/src/tools/calculator.ts

import { z } from 'zod';

export const calculatorSchema = z.object({
  operacion: z.enum(['sumar', 'restar', 'multiplicar', 'dividir']),
  a: z.number(),
  b: z.number(),
});

export function calculator(input: z.infer<typeof calculatorSchema>) {
  let resultado: number;
  
  switch (input.operacion) {
    case 'sumar':
      resultado = input.a + input.b;
      break;
    case 'restar':
      resultado = input.a - input.b;
      break;
    case 'multiplicar':
      resultado = input.a * input.b;
      break;
    case 'dividir':
      if (input.b === 0) throw new Error('No se puede dividir por cero');
      resultado = input.a / input.b;
      break;
  }
  
  return { resultado };
}

export const calculatorDescription = 
  'Realiza operaciones matemáticas básicas. Úsalo cuando el usuario quiera hacer cálculos.';
```

**Paso 2:** Registrar en `index.ts`

```typescript
// packages/core/src/tools/index.ts

import { calculator, calculatorDescription } from './calculator';

export const tools = {
  // ... existentes
  calculator,
};

export const TOOL_DESCRIPTIONS = {
  // ... existentes
  calculator: calculatorDescription,
};

// Agregar al tipo Capability
export type Capability = 
  | ... 
  | 'calculator';
```

**Paso 3:** Probar

```bash
npm run test -- --grep "calculator"
```

---

## 4. Agregar un nuevo componente UI

### Ejemplo: Crear componente `Badge`

**Paso 1:** Crear el archivo

```tsx
// apps/web/components/ui/badge.tsx

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const variants = {
    default: 'bg-surface text-text',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
  };
  
  return (
    <span className={cn(
      'px-2 py-1 rounded-full text-xs font-medium',
      variants[variant]
    )}>
      {children}
    </span>
  );
}
```

**Paso 2:** Usarlo

```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="success">Activo</Badge>
<Badge variant="warning">Pendiente</Badge>
<Badge variant="error">Error</Badge>
```

---

## 5. Agregar una migración de base de datos

### Ejemplo: Agregar tabla `Product`

**Paso 1:** Editar el schema

```prisma
// packages/core/prisma/schema.prisma

model Product {
  id          String   @id @default(cuid())
  name        String
  price       Float
  createdAt   DateTime @default(now())
}
```

**Paso 2:** Crear la migración

```bash
npx prisma migrate dev --name add-product-table
```

**Paso 3:** Usar en el código

```typescript
import { prisma } from '@ultraia/core';

// Crear producto
const product = await prisma.product.create({
  data: { name: 'Plan Pro', price: 29 },
});

// Listar productos
const products = await prisma.product.findMany();
```

---

## 6. Agregar una variable de entorno

**Paso 1:** Agregar al `.env`

```bash
# En la raíz del proyecto
MI_NUEVA_API_KEY=tu-api-key-aqui
```

**Paso 2:** Agregar al `.env.example`

```bash
# En la raíz del proyecto
MI_NUEVA_API_KEY=tu-api-key-aqui
```

**Paso 3:** Usarla

```typescript
const apiKey = process.env.MI_NUEVA_API_KEY;
```

---

## 7. Agregar un nuevo workspace

**Paso 1:** Crear la carpeta

```bash
mkdir packages/mi-libreria
cd packages/mi-libreria
npm init -y
```

**Paso 2:** Configurar `package.json`

```json
{
  "name": "@ultraia/mi-libreria",
  "version": "1.0.0",
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

**Paso 3:** Agregar al root `package.json`

```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

**Paso 4:** Instalar

```bash
npm install
```

---

## 8. Ejecutar un solo test

```bash
# Correr tests que coincidan con un patrón
npm run test -- --grep "calculator"

# Correr tests de un archivo específico
npm run test -- packages/core/src/tools/calculator.test.ts

# Correr todos los tests
npm run test
```

---

## 9. Solucionar problemas comunes

### "Module not found"

```bash
# Reinstalar dependencias
rm -rf node_modules
npm install
```

### "Type error"

```bash
# Verificar tipos
npm run typecheck
```

### "Port already in use"

```bash
# Matar procesos en el puerto
taskkill /F /IM node.exe

# O usar el flag --clean
python start.py --clean
```

### "Database not found"

```bash
# Crear la base de datos
npm run db:migrate
```

### "Build falls in Windows"

```bash
# Correr desde apps/web con más memoria
cd apps/web
node --max-old-space-size=4096 ../../node_modules/next/dist/bin/next build
```

### "Tests fail after editing"

```bash
# Limpiar caché de vitest
rm -rf node_modules/.vite
npm run test
```

### "ESLint errors"

```bash
# Auto-fix
npm run lint -- --fix
```

### "Prisma client not generated"

```bash
# Generar cliente
npx prisma generate
```

### "CORS error"

```bash
# Verificar next.config.ts
# Agregar dominio a images.remotePatterns si es necesario
```

### "Rate limited"

```bash
# Esperar 1 minuto o reiniciar el servidor
```

---

## 10. Comandos útiles

```bash
# Desarrollo
npm run dev                    # Iniciar dev server
python start.py                # Todo en un comando
python start.py --web          # Solo web
python start.py --hooks        # Solo webhooks
python start.py --gen-engine   # Solo gen-engine
python start.py --check-connections  # Verificar todo

# Build
npm run build                  # Production build
npm run gate                   # Verificar gates

# Tests
npm run test                   # Todos los tests
npm run test -- --grep "auth"  # Tests de auth

# Type checking
npm run typecheck              # Verificar tipos

# Lint
npm run lint                   # Verificar código
npm run lint -- --fix          # Auto-fix

# Database
npm run db:migrate             # Crear/actualizar DB
npx prisma studio              # Ver datos
npx prisma generate            # Generar cliente

# Git
git add <archivos>             # Agregar archivos específicos
git commit -m "feat(scope): desc"  # Commit
git status                     # Ver estado
git log --oneline -10          # Ver últimos commits
```

---

## 11. Estructura de archivos

```
UltraIa/
├── apps/
│   ├── web/                   # Next.js app
│   │   ├── app/               # Pages (App Router)
│   │   │   ├── (app)/         # Authenticated pages
│   │   │   ├── api/           # API routes
│   │   │   └── layout.tsx     # Root layout
│   │   ├── components/        # React components
│   │   │   ├── ui/            # UI kit
│   │   │   └── app-shell/     # Nav, sidebar
│   │   └── src/lib/server/    # Server utilities
│   └── mobile/                # React Native app
├── packages/
│   ├── core/                  # AI, tools, DB, auth
│   │   ├── src/
│   │   │   ├── ai/            # LLM engine
│   │   │   ├── auth/          # Authentication
│   │   │   ├── tools/         # 87 tools
│   │   │   └── db/            # Prisma client
│   │   └── prisma/            # Schema + migrations
│   └── runtime/               # Offline engine
├── scripts/                   # Python scripts
├── Task/                      # Automated tasks
├── gen-engine/                # Generation engine
├── start.py                   # One-command launcher
├── STATE.md                   # Current state
├── AGENTS.md                  # Agent rules
└── ULTRAIA-KNOWLEDGE/         # This documentation
```

---

## 12. Referencias

- [Next.js docs](https://nextjs.org/docs)
- [React docs](https://react.dev)
- [TypeScript docs](https://www.typescriptlang.org/docs)
- [Prisma docs](https://www.prisma.io/docs)
- [Tailwind CSS docs](https://tailwindcss.com/docs)

---

**Última actualización:** 2026-09-04
