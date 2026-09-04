# API — Cómo se comunican el frontend y backend

> **Ubicación:** `apps/web/src/app/api/`
> **Tipo:** Next.js Route Handlers (App Router)
> **Formato:** REST API con JSON

---

## 1. ¿Qué es una API?

Es como un **mesonero en un restaurante**:
- Tú (el frontend) le pides algo al mesonero (la API)
- El mesonero va a la cocina (la base de datos)
- El mesonero trae tu pedido (los datos)
- Tú le muestras al cliente (el usuario)

```
Tú (navegador) → API → Base de Datos → API → Tú (navegador)
```

---

## 2. Las APIs de UltraIa

| Ruta | Método | Qué hace |
|------|--------|----------|
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/auth/register` | POST | Crear cuenta |
| `/api/auth/me` | GET | ¿Quién soy? |
| `/api/chat` | POST | Hablar con la IA |
| `/api/cloud/files` | GET | Listar archivos |
| `/api/cloud/upload` | POST | Subir archivo |
| `/api/publications` | GET | Ver publicaciones |
| `/api/publications` | POST | Crear publicación |
| `/api/omag` | POST | Generar video |

---

## 3. Ejemplo: crear una API

### Paso 1: Crear el archivo

```typescript
// apps/web/src/app/api/mi-api/route.ts

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // GET = cuando el navegador pide datos
  return NextResponse.json({ mensaje: 'Hola mundo' });
}

export async function POST(request: Request) {
  // POST = cuando el navegador envía datos
  const body = await request.json();
  
  // Hacer algo con los datos
  console.log('Recibí:', body);
  
  return NextResponse.json({ 
    mensaje: 'Recibí tu dato',
    dato: body 
  });
}
```

### Paso 2: Usarla desde el frontend

```typescript
// En un componente React

// GET (pedir datos)
const response = await fetch('/api/mi-api');
const data = await response.json();
console.log(data.mensaje); // "Hola mundo"

// POST (enviar datos)
const response = await fetch('/api/mi-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre: 'Juan' }),
});
const data = await response.json();
console.log(data.mensaje); // "Recibí tu dato"
```

---

## 4. Cómo funciona la autenticación en APIs

```typescript
// apps/web/src/app/api/mi-api/route.ts

import { getCurrentUser } from '@/lib/server/context';

export async function GET(request: Request) {
  // Obtener el usuario logueado
  const user = await getCurrentUser(request);
  
  if (!user) {
    // No está logueado → error 401
    return NextResponse.json(
      { error: 'No autorizado' }, 
      { status: 401 }
    );
  }
  
  // Está logueado → devolver datos personalizados
  return NextResponse.json({ 
    mensaje: `Hola ${user.name}` 
  });
}
```

---

## 5. Convenciones de UltraIa

### Estados HTTP

| Código | Significado | Cuándo usar |
|--------|-------------|-------------|
| 200 | OK | Todo bien |
| 201 | Created | Se creó algo nuevo |
| 400 | Bad Request | Datos inválidos |
| 401 | Unauthorized | No estás logueado |
| 403 | Forbidden | No tienes permiso |
| 404 | Not Found | No se encontró |
| 429 | Too Many Requests | Rate limit |
| 500 | Server Error | Algo se rompió |

### Formato de respuesta

```typescript
// Éxito
{ "data": { ... } }

// Error
{ "error": "Mensaje de error claro" }
```

---

## 6. Cómo crear una API con base de datos

```typescript
// apps/web/src/app/api/posts/route.ts

import { prisma } from '@ultraia/core';
import { getCurrentUser } from '@/lib/server/context';

export async function GET() {
  // Obtener todos los posts
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
  });
  
  return NextResponse.json({ data: posts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  const body = await request.json();
  
  const post = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: user.id,
    },
  });
  
  return NextResponse.json({ data: post }, { status: 201 });
}
```

---

## 7. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "CORS error" | Dominio diferente | Configurar `next.config.ts` |
| "413 Payload Too Large" | Archivo muy grande | Aumentar límite o comprimir |
| "500 Internal Server Error" | Error en el código | Revisar logs del servidor |

---

## 8. Referencias

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [REST API best practices](https://restfulapi.net)

---

**Última actualización:** 2026-09-04
