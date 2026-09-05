# Language & Framework Quick Reference

## TypeScript / JavaScript
```typescript
// Patterns
- Factory Pattern: createX() returns interface implementations
- Strategy Pattern: pass functions as behavior
- Observer Pattern: EventEmitter / custom event bus
- Dependency Injection: constructor injection, inversify
- Repository Pattern: abstract data access
- MVC/MVVM: separation of concerns

// Best Practices
- Use `interface` over `type` for object shapes
- Use `as const` for literal types
- Use discriminated unions for state machines
- Use `satisfies` for type narrowing
- Avoid `any` — use `unknown` and narrow
- Use `Promise.all` for parallel async
- Use `Map/Set` over objects for dynamic keys
```

## Python
```python
# Patterns
- Context Managers: `with` for resource management
- Decorators: @decorator for cross-cutting concerns
- Dataclasses: @dataclass for structured data
- Type Hints: modern Python uses them everywhere
- Async/Await: asyncio for concurrent I/O

# Best Practices
- Use `pathlib` over `os.path`
- Use `f-strings` over `.format()`
- Use `dataclasses` or Pydantic for models
- Use `functools.lru_cache` for memoization
- Type hints are mandatory in modern Python
- Use `pytest` over `unittest`
```

## Rust
```rust
// Patterns
- Ownership: move, borrow, clone
- Traits: interfaces with default implementations
- Enums: algebraic types with match
- Result<T, E>: error handling without exceptions
- Option<T>: null safety
- Builder Pattern: common for complex config

// Best Practices
- Use `thiserror` for library errors
- Use `anyhow` for application errors
- Use `serde` for serialization
- Prefer `&str` over `String` in functions
- Use `clippy` for linting
- Use `cargo fmt` for formatting
```

## Go
```go
// Patterns
- Interfaces: implicit satisfaction (duck typing)
- Goroutines: lightweight concurrency
- Channels: communication between goroutines
- Error Handling: explicit, no exceptions
- Middleware: function composition for HTTP

// Best Practices
- Handle errors explicitly (no _ = err)
- Use `context.Context` for cancellation
- Use `go fmt` and `go vet`
- Table-driven tests
- Interface at consumer, not producer
```

## C# / .NET
```csharp
// Patterns
- Dependency Injection: built-in DI container
- Repository + Unit of Work: data access abstraction
- Mediator: CQRS with MediatR
- Builder: fluent configuration
- Options Pattern: strongly-typed config

// Best Practices
- Use records for immutable data
- Use nullable reference types
- Use primary constructors (C# 12)
- Use source generators for code gen
- async/await all the way down
```

## SQL
```sql
-- Optimization
- EXPLAIN ANALYZE before optimizing
- Index columns used in WHERE/JOIN
- Use covering indexes for frequent queries
- Avoid SELECT * — specify columns
- Use CTEs for complex queries
- Batch inserts/updates

-- Patterns
- Window Functions: ROW_NUMBER, LAG, LEAD
- Common Table Expressions: WITH RECURSIVE
- Upsert: INSERT ... ON CONFLICT
- Materialized Views: precomputed expensive queries
```

## Shader Programming (GLSL/HLSL)
```glsl
// Vertex Shader
- Transform vertices: model * view * projection
- Pass varyings to fragment shader
- Skin mesh for skeletal animation

// Fragment Shader
- Sample textures
- Calculate lighting (Blinn-Phong, PBR)
- Post-processing effects
- Use uniforms for parameters

// Performance
- Minimize texture lookups
- Use mediump where possible
- Avoid branches in shaders
- Use step() instead of if()
```
