# HOW-TO — Guías paso a paso para tareas comunes

> **Nivel:** Principiante a intermedio
> **Prerrequisitos:** Node.js 20+, Python 3.10+, npm

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

export async function GET() {
  const products = [
    { id: 1, name: 'Plan Básico', price: 0 },
    { id: 2, name: 'Plan Pro', price: 29 },
  ];
  
  return NextResponse.json({ data: products });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  // Guardar en la DB (ejemplo)
  console.log('Nuevo producto:', body);
  
  return NextResponse.json({ 
    data: body,
    message: 'Producto creado' 
  }, { status: 201 });
}
```

**Paso 2:** Probar

```bash
# GET
curl http://localhost:3000/api/products

# POST
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Plan Premium", "price": 49}'
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

**Paso 2:** Registrar

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

**Paso 2:** Agregar al `.env.example` (para que otros sepan que existe)

```bash
# En la raíz del proyecto
MI_NUEVA_API_KEY=tu-api-key-aqui
```

**Paso 3:** Usarla

```typescript
const apiKey = process.env.MI_NUEVA_API_KEY;
```

---

## 7. Agregar un nuevo componente de página

### Ejemplo: Crear componente `PricingCard`

**Paso 1:** Crear el archivo

```tsx
// apps/web/components/pricing-card.tsx

import { Button } from '@/components/ui/button';

interface PricingCardProps {
  nombre: string;
  precio: number;
  caracteristicas: string[];
  recomendado?: boolean;
}

export function PricingCard({ 
  nombre, 
  precio, 
  caracteristicas, 
  recomendado = false 
}: PricingCardProps) {
  return (
    <div className={`
      glass-panel p-6 rounded-lg
      ${recomendado ? 'ring-2 ring-primary' : ''}
    `}>
      {recomendado && (
        <span className="text-xs font-semibold text-primary">
          RECOMENDADO
        </span>
      )}
      
      <h3 className="text-xl font-bold mt-2">{nombre}</h3>
      <p className="text-3xl font-bold mt-2">
        ${precio}
        <span className="text-sm text-text-secondary">/mes</span>
      </p>
      
      <ul className="mt-4 space-y-2">
        {caracteristicas.map((car, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            {car}
          </li>
        ))}
      </ul>
      
      <Button className="w-full mt-6">
        Empezar
      </Button>
    </div>
  );
}
```

**Paso 2:** Usarlo en una página

```tsx
// apps/web/app/pricing/page.tsx

import { PricingCard } from '@/components/pricing-card';

export default function PricingPage() {
  return (
    <div className="grid grid-cols-3 gap-8">
      <PricingCard
        nombre="Básico"
        precio={0}
        caracteristicas={[
          '5 imágenes/mes',
          '1 video/mes',
          'Soporte básico'
        ]}
      />
      
      <PricingCard
        nombre="Pro"
        precio={29}
        caracteristicas={[
          '100 imágenes/mes',
          '20 videos/mes',
          'Soporte prioritario',
          'API access'
        ]}
        recomendado
      />
      
      <PricingCard
        nombre="Enterprise"
        precio={99}
        caracteristicas={[
          'Ilimitado',
          'Soporte 24/7',
          'SLA 99.9%',
          'Custom integrations'
        ]}
      />
    </div>
  );
}
```

---

## 8. Agregar una nueva dependencia

### Dependencia de producción

```bash
# Para el workspace web
npm install nombre-paquete --workspace=@ultraia/web

# Para el workspace core
npm install nombre-paquete --workspace=@ultraia/core
```

### Dependencia de desarrollo

```bash
npm install -D nombre-paquete --workspace=@ultraia/web
```

---

## 9. Ejecutar un solo test

```bash
# Correr tests que coincidan con un patrón
npm run test -- --grep "calculator"

# Correr tests de un archivo específico
npm run test -- packages/core/src/tools/calculator.test.ts
```

---

## 10. Solucionar problemas comunes

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
```

### "Database not found"

```bash
# Crear la base de datos
npm run db:migrate
```

---

## 11. Referencias

- [Next.js docs](https://nextjs.org/docs)
- [React docs](https://react.dev)
- [TypeScript docs](https://www.typescriptlang.org/docs)

---

**Última actualización:** 2026-09-04
