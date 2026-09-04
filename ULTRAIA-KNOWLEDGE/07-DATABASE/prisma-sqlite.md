# Database — Prisma y SQLite

> **ORM:** Prisma (Object-Relational Mapper)
> **Base de datos:** SQLite (archivo local)
> **Schema:** `packages/core/prisma/schema.prisma`
> **Datos:** `packages/core/prisma/dev.db`

---

## 1. ¿Qué es una base de datos?

Es como un **archivador gigante** donde se guarda toda la información:
- Usuarios
- Sesiones
- Publicaciones
- Archivos en la nube
- etc.

**SQLite** es una base de datos que vive en UN solo archivo (`dev.db`). No necesitas instalar un servidor separado.

---

## 2. ¿Qué es Prisma?

Es como un **intérprete** que traduce entre tu código TypeScript y la base de datos.

```
Tú escribes:  prisma.user.findMany()
Prisma traduce: SELECT * FROM User
La DB responde: [{ id: 1, name: "Admin" }]
Prisma devuelve: [{ id: 1, name: "Admin" }]
```

---

## 3. El schema (el "plano" de la DB)

```prisma
// packages/core/prisma/schema.prisma

// Conexión a la base de datos
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // file:./dev.db
}

// Modelos = tablas en la DB
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  role          String    @default("USER")
  createdAt     DateTime  @default(now())
  
  // Relaciones
  sessions      Session[]
  workspaces    Workspace[]
}

model Session {
  id        String   @id @default(cuid())
  token     String   @unique  // Hash del token
  userId    String
  expiresAt DateTime
  
  // Relación
  user      User     @relation(fields: [userId], references: [id])
}

model Publication {
  id          String   @id @default(cuid())
  title       String
  status      String   @default("DRAFT")  // DRAFT, APPROVED, PUBLISHED
  scheduledAt DateTime?
  createdAt   DateTime @default(now())
}
```

---

## 4. Comandos importantes

```bash
# Crear la base de datos
npm run db:migrate

# Actualizar el schema
npx prisma migrate dev --name mi-cambio

# Ver los datos (abrir consola de Prisma)
npx prisma studio

# Resetear la DB (borrar todo)
npx prisma migrate reset

# Generar el cliente de Prisma
npx prisma generate
```

---

## 5. Cómo hacer consultas

### Encontrar un usuario

```typescript
import { prisma } from '@ultraia/core';

// Buscar por email
const user = await prisma.user.findUnique({
  where: { email: 'admin@ultraia.local' },
});

// Buscar por ID
const user = await prisma.user.findUnique({
  where: { id: 'abc123' },
});
```

### Crear un usuario

```typescript
const user = await prisma.user.create({
  data: {
    email: 'nuevo@ejemplo.com',
    name: 'Nuevo Usuario',
    passwordHash: await hashPassword('contraseña'),
    role: 'USER',
  },
});
```

### Actualizar un usuario

```typescript
const user = await prisma.user.update({
  where: { id: 'abc123' },
  data: { name: 'Nuevo Nombre' },
});
```

### Eliminar un usuario

```typescript
await prisma.user.delete({
  where: { id: 'abc123' },
});
```

### Listar todos los usuarios

```typescript
const users = await prisma.user.findMany({
  orderBy: { createdAt: 'desc' },
});
```

---

## 6. Cómo agregar una nueva tabla

### Paso 1: Agregar el modelo al schema

```prisma
// packages/core/prisma/schema.prisma

model MiNuevaTabla {
  id        String   @id @default(cuid())
  nombre    String
  contenido String?
  createdAt DateTime @default(now())
}
```

### Paso 2: Crear la migración

```bash
npx prisma migrate dev --name mi-nueva-tabla
```

### Paso 3: Usarla en el código

```typescript
import { prisma } from '@ultraia/core';

// Crear
const item = await prisma.miNuevaTabla.create({
  data: { nombre: 'Ejemplo' },
});

// Leer
const items = await prisma.miNuevaTabla.findMany();

// Actualizar
await prisma.miNuevaTabla.update({
  where: { id: item.id },
  data: { contenido: 'Nuevo contenido' },
});

// Eliminar
await prisma.miNuevaTabla.delete({
  where: { id: item.id },
});
```

---

## 7. Datos de prueba

El proyecto viene con un usuario admin pre-creado:

| Campo | Valor |
|-------|-------|
| Email | `admin@ultraia.local` |
| Nombre | `admin` |
| Contraseña | `admin` |
| Rol | `ADMIN` |

---

## 8. Problemas comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Database not found" | No se ejecutó migrate | `npm run db:migrate` |
| "Table doesn't exist" | Falta migración | `npx prisma migrate dev` |
| "Unique constraint failed" | Dato duplicado | Usar `upsert` o verificar |
| "Too many relations" | Schema mal diseñado | Simplificar relaciones |

---

## 9. Referencias

- [Prisma docs](https://www.prisma.io/docs)
- [SQLite docs](https://www.sqlite.org/docs.html)

---

**Última actualización:** 2026-09-04
