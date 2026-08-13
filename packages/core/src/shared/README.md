# Carpeta `shared/` del core (código de dominio reutilizado, comentado)

Igual que la carpeta `shared/` de la web: **copia de referencia para entender**, no se
usa en la lógica real. El código real está en `packages/core/src/...` (rutas abajo).

## Archivos
- `domain.ts` → tipos y funciones de dominio que se usan desde la app web.

## Glosario para ti
- **Dominio**: la "lógica de negocio" pura (sin pantallas): cómo se crea un agente, cómo se evalúa.
- **Gateway**: puerta de enlace. Aquí, el objeto que traduce nuestras llamadas al formato de la API de IA.
- **Blueprint (borrador)**: el diseño generado de un agente (prompt, modelo, herramientas, rúbrica).
