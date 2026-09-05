# Security & Architecture Guide

## OWASP Top 10 (2021)
1. **Broken Access Control** — enforce server-side auth checks
2. **Cryptographic Failures** — use TLS, hash passwords with bcrypt/argon2
3. **Injection** — parameterized queries, input validation
4. **Insecure Design** — threat modeling, secure patterns
5. **Security Misconfiguration** — disable defaults, harden configs
6. **Vulnerable Components** — update deps, scan for CVEs
7. **Auth Failures** — rate limit, MFA, secure session
8. **Data Integrity Failures** — verify signatures, CI/CD security
9. **Logging Failures** — audit logs, no sensitive data in logs
10. **SSRF** — validate URLs, block internal IPs

## Authentication Patterns
```typescript
// JWT Best Practices
- Short-lived access tokens (15min)
- Refresh token rotation
- HttpOnly + Secure + SameSite cookies
- Never store in localStorage
- Validate signature AND expiry

// OAuth2 Flows
- Authorization Code + PKCE: web apps (recommended)
- Client Credentials: machine-to-machine
- Device Code: TV, CLI, IoT

// Password Hashing
- Argon2id: memory-hard, recommended
- bcrypt: widely supported, good default
- PBKDF2: NIST recommended
- Never: MD5, SHA1, plain text

// Session Management
- Server-side sessions with secure cookies
- Session fixation: regenerate on login
- Session invalidation: on logout, password change
- Idle timeout: 15-30 minutes
- Absolute timeout: 8-24 hours
```

## Authorization
```typescript
// RBAC (Role-Based)
roles: ['admin', 'editor', 'viewer']
permissions: { admin: '*', editor: ['read', 'write'], viewer: ['read'] }

// ABAC (Attribute-Based)
policy: {
  subject: { role: 'editor', department: 'content' },
  resource: { type: 'article', owner: 'self' },
  action: 'publish',
  condition: { time: 'business-hours' }
}

// Resource-Level
- Owner check: user owns the resource
- Scope check: user has access to the resource's scope
- Shared access: explicit grants

// API Keys
- Prefix for identification: `sk_live_...`
- Hash for storage (never plaintext)
- Scoped permissions
- Rate limiting per key
- Rotation support
```

## Cryptography
```typescript
// Symmetric (same key)
- AES-256-GCM: authenticated encryption
- ChaCha20-Poly1305: fast, constant time
- Use: data at rest, session tokens

// Asymmetric (key pair)
- RSA-2048+ or ECDSA P-256+
- Use: JWT signing, TLS, key exchange

// Hashing (one-way)
- Argon2id: passwords (slow by design)
- SHA-256: data integrity, not passwords
- HMAC-SHA-256: message authentication

// TLS
- TLS 1.3: modern, fast, secure
- HSTS: force HTTPS
- Certificate pinning: mobile apps
```

## Secure Coding
```typescript
// Input Validation
- Whitelist over blacklist
- Type checking + format validation
- Length limits
- Encode output (prevent XSS)

// SQL Injection
- Parameterized queries (always)
- ORM query builders
- Stored procedures
- Never concatenate user input

// XSS Prevention
- Content Security Policy headers
- Escape HTML output
- HttpOnly cookies (no JS access)
- Use textContent over innerHTML

// CSRF Protection
- SameSite cookies
- CSRF tokens
- Origin/Referer header checks
- Double submit cookie pattern

// Secrets Management
- Environment variables (never in code)
- .env files (never committed)
- Secret managers (Vault, AWS SM)
- Rotate regularly
- Audit access
```

## Architecture Patterns
```
Monolith:
- Simple deployment
- Easy debugging
- Start here unless you need microservices

Microservices:
- Independent deployment
- Technology diversity
- Fault isolation
- Requires: service mesh, observability

Serverless:
- Auto-scaling
- Pay per use
- Cold start latency
- Good for: APIs, events, cron

Event-Driven:
- Loose coupling
- Async processing
- Event sourcing
- CQRS pattern

Clean Architecture:
- Entities (domain objects)
- Use Cases (business logic)
- Interface Adapters (controllers, presenters)
- Frameworks & Drivers (UI, DB, external)

Domain-Driven Design:
- Bounded Contexts
- Aggregates
- Domain Events
- Ubiquitous Language
```

## API Design
```yaml
# REST Conventions
GET /resources          # list
GET /resources/:id      # read
POST /resources         # create
PUT /resources/:id      # update (full)
PATCH /resources/:id    # update (partial)
DELETE /resources/:id   # delete

# Response Format
{
  "data": { ... },           # single resource
  "data": [ ... ],           # collection
  "meta": { "total": 100 },  # pagination
  "links": { "next": "..." } # HATEOAS
}

# Error Format
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}

# Versioning
- URL: /v1/resources (simple, recommended)
- Header: Accept-Version: v1
- Query: /resources?version=1
```

## Database Design
```sql
-- Normalization
1NF: atomic values, no repeating groups
2NF: partial dependency on composite key
3NF: no transitive dependency

-- Indexing
- Primary key: automatic index
- Foreign key: always index
- WHERE clause: index frequently queried columns
- ORDER BY: index sort columns
- Composite: index (a, b) for queries on a OR (a, b)

-- Migration Strategy
1. Add new column (nullable)
2. Deploy code that writes to new column
3. Backfill existing data
4. Add NOT NULL constraint
5. Remove old column

-- Performance
- Connection pooling
- Query optimization (EXPLAIN ANALYZE)
- Caching layer (Redis)
- Read replicas
- Partitioning for large tables
```

## DevOps & CI/CD
```yaml
# Pipeline Stages
1. Lint: code style, formatting
2. Type Check: static analysis
3. Unit Tests: fast, isolated
4. Integration Tests: with dependencies
5. Build: compile, bundle
6. E2E Tests: full workflow
7. Security Scan: dependencies, SAST
8. Deploy: staging → production
9. Monitor: health checks, alerts

# Docker Best Practices
- Multi-stage builds
- Non-root user
- .dockerignore
- Health checks
- Minimize layers
- Use specific tags (not latest)

# Kubernetes
- Deployments: desired state
- Services: networking
- ConfigMaps: configuration
- Secrets: sensitive data
- Ingress: external access
- HPA: auto-scaling
```
