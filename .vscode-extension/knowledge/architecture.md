# Decision Framework & Architecture Patterns

## Technology Selection Matrix

### When to Use What

| Need | Use | Why |
|------|-----|-----|
| Simple CRUD app | Next.js + SQLite | Fast to build, easy deploy |
| Real-time features | WebSockets + Redis | Low latency, pub/sub |
| Complex business logic | Go/Rust + PostgreSQL | Type safety, performance |
| Mobile app | React Native/Flutter | Cross-platform, native feel |
| Game | Unity/Godot/Unreal | Engine ecosystem |
| CLI tool | Go/Rust/Python | Fast startup, easy distribute |
| Data pipeline | Python + Airflow | Rich ecosystem, scheduling |
| ML inference | Python + FastAPI | Model serving, GPU access |
| High traffic API | Go/Rust | Concurrency, memory efficiency |
| Prototype | Next.js + Prisma | Full-stack, type-safe |

### Frontend Framework Decision
```
React (Next.js):
+ Largest ecosystem
+ Server Components
+ Vercel deployment
+ TypeScript first
- Bundle size
- Complexity

Vue (Nuxt):
+ Gentle learning curve
+ Excellent documentation
+ Composition API
- Smaller ecosystem
- Fewer job listings

SvelteKit:
+ Smallest bundle
+ No virtual DOM
+ Simple syntax
- Younger ecosystem
- Fewer libraries

Astro:
+ Static-first
+ Multi-framework
+ Content sites
- Not for SPAs
- Limited dynamic

Angular:
+ Enterprise features
+ CLI generation
+ RxJS
- Verbose
- Steep learning curve
```

### Backend Framework Decision
```
Node.js (Express/Fastify):
+ JavaScript everywhere
+ Async I/O
+ npm ecosystem
- Single threaded
- Callback complexity

Python (FastAPI/Django):
+ ML/AI integration
+ Rapid development
+ Rich libraries
- GIL limitations
- Type system

Go (Gin/Echo):
+ Concurrency
+ Fast execution
+ Simple deployment
- Verbose error handling
- No generics (until 1.18)

Rust (Actix/Axum):
+ Memory safety
+ Zero-cost abstractions
+ WebAssembly
- Steep learning curve
- Slow compilation

Java (Spring Boot):
+ Enterprise standards
+ Mature ecosystem
+ JVM performance
- Boilerplate
- Memory overhead

C# (ASP.NET):
+ Microsoft ecosystem
+ Unity integration
+ Enterprise
- Windows bias
- Licensing concerns
```

### Database Decision
```
PostgreSQL:
+ Full ACID
+ Rich types (JSON, arrays)
+ Extensions (PostGIS, pgvector)
+ Best for: complex queries, data integrity

MySQL:
+ Fast reads
+ Simple setup
+ Best for: web apps, CMS

SQLite:
+ Embedded, zero config
+ Single file
+ Best for: mobile, desktop, testing

MongoDB:
+ Schema flexibility
+ Horizontal scaling
+ Best for: documents, real-time

Redis:
+ In-memory speed
+ Data structures
+ Best for: caching, sessions, queues

DynamoDB:
+ Serverless
+ Auto-scaling
+ Best for: serverless, key-value
```

## Architecture Decision Records

### ADR Template
```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted

## Context
We need a database for user data, orders, and products.

## Decision
We will use PostgreSQL as our primary database.

## Consequences
+ ACID compliance for transactions
+ JSON support for flexible schemas
+ pgvector for AI embeddings
- Requires hosting and maintenance
- learning curve for advanced features
```

## Design Patterns

### Creational
- **Factory**: create objects without specifying class
- **Builder**: construct complex objects step by step
- **Singleton**: single instance (use sparingly)
- **Prototype**: clone existing objects

### Structural
- **Adapter**: interface compatibility
- **Decorator**: add behavior dynamically
- **Facade**: simplified interface
- **Proxy**: controlled access

### Behavioral
- **Strategy**: interchangeable algorithms
- **Observer**: event notification
- **Command**: encapsulate actions
- **State**: state-driven behavior

### Architectural
- **MVC**: Model-View-Controller
- **MVVM**: Model-View-ViewModel
- **Clean Architecture**: dependency rule
- **Hexagonal**: ports and adapters
- **Event Sourcing**: state from events
- **CQRS**: separate read/write models

## Error Handling Strategy
```typescript
// Layer-Specific
- Infrastructure: catch and log, translate to domain
- Domain: specific error types, no catch
- Application: catch domain errors, handle workflow
- UI: catch application errors, show user message

// Error Types
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) { super(message); }
}

// Handling
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof AppError && error.isOperational) {
    return { error: error.message };
  }
  logger.error(error);
  throw new AppError('INTERNAL', 'Something went wrong');
}
```

## Performance Budget
```
Web:
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Cumulative Layout Shift: < 0.1
- Total Bundle: < 200KB (gzipped)

Mobile:
- App Launch: < 2s
- Screen Transition: < 300ms
- List Scroll: 60fps
- Memory: < 200MB
- Battery: minimal impact

API:
- Response Time: < 200ms (p95)
- Throughput: > 1000 req/s
- Error Rate: < 0.1%
- Availability: 99.9%

Game:
- Frame Time: < 16ms (60fps)
- Load Time: < 5s
- Memory: within platform limits
- Draw Calls: < 100
```
