# Plan: Hypothesis Quest 3D — Butterfly Effect Learning Game

## Context
User requested a 3D learning game with butterfly effect (chaos theory) and MOBA/MMORPG-style movement, based on the "Hypothesis Quest" concept from `ImportantePAraMi&&Conocimiento/chatDeepseek.md`. The game should use existing UltraIa capabilities (geometry, physics, procedural generation, VFX) and run as an external standalone module in the browser.

## Objective
Build a web-based 3D educational game where players explore unsolved math problems through interactive levels, with butterfly effect mechanics (sensitive dependence on initial conditions) and third-person MOBA-style movement.

## Architecture

### Tech Stack
- **Renderer**: Three.js (already in project)
- **Physics**: Custom chaos simulation (Lorenz attractor) + simple collision
- **Movement**: Third-person camera, WASD + mouse (MOBA/MMORPG style)
- **Levels**: 4 main levels based on unsolved problems
- **Butterfly Effect**: Lorenz attractor drives environment dynamics — small changes in player position create drastically different world states

### External Module Location
```
apps/web/src/app/(app)/hypothesis-quest/
├── page.tsx                    # Route entry (server component)
├── hypothesis-quest-client.tsx # Main game client (Three.js canvas)
├── engine/
│   ├── chaos.ts               # Lorenz attractor + chaos simulation
│   ├── player.ts              # Third-person player controller
│   ├── camera.ts              # MOBA-style camera (orbit + follow)
│   ├── world.ts               # World generator from chaos state
│   └── levels/
│       ├── collatz.ts         # Level 1: Collatz Conjecture
│       ├── goldbach.ts        # Level 2: Goldbach Conjecture
│       ├── riemann.ts         # Level 3: Riemann Hypothesis
│       └── pnp.ts             # Level 4: P vs NP
├── components/
│   ├── hud.tsx                # HUD overlay (React)
│   ├── menu.tsx               # Main menu (React)
│   └── level-select.tsx       # Level selection
└── styles/
    └── hypothesis-quest.css   # Game-specific styles
```

### Butterfly Effect Implementation
The Lorenz attractor equations:
```
dx/dt = σ(y - x)
dy/dt = x(ρ - z) - y
dz/dt = xy - βz
```
Where σ=10, ρ=28, β=8/3 (classic chaotic parameters).

**How it affects gameplay:**
1. **World Generation**: Player's initial position becomes the seed for the Lorenz attractor. Tiny differences create completely different level layouts.
2. **Dynamic Obstacles**: Particle systems follow the attractor轨迹, creating unpredictable movement patterns.
3. **Branching Paths**: Each decision point saves a "butterfly seed" — revisiting later shows how that choice rippled through the world.
4. **Visual Feedback**: Trail visualization shows the chaos trajectory, teaching players about sensitive dependence.

### Level Design

#### Level 1: Collatz Conjecture (3n+1)
- **3D World**: Floating number platforms in a spiral tower
- **Mechanic**: Player jumps between platforms, each jump applies Collatz rules (even→/2, odd→3n+1)
- **Butterfly Effect**: Small timing differences in jumps change which platforms appear ahead
- **Goal**: Reach platform "1" at the top

#### Level 2: Goldbach Conjecture
- **3D World**: Pairs of glowing prime number orbs floating in space
- **Mechanic**: Player must touch two primes that sum to a target even number
- **Butterfly Effect**: Which primes are visible depends on player's approach angle (chaos-filtered)
- **Goal**: Find all valid pairs before the visualization collapses

#### Level 3: Riemann Hypothesis
- **3D World**: Complex plane as a landscape, critical line (Re=0.5) as a glowing path
- **Mechanic**: Player places "zeros" on the critical line while avoiding trivial zeros
- **Butterfly Effect**: Each placed zero shifts the zeta function visualization, creating new obstacles
- **Goal**: Place 10 zeros correctly on the critical line

#### Level 4: P vs NP
- **3D World**: Maze of boolean gates and switches
- **Mechanic**: Toggle switches to satisfy all clause gates (SAT problem)
- **Butterfly Effect**: Toggle order changes gate configurations (chaos propagation)
- **Goal**: Satisfy all clauses with minimum moves

### Integration with Existing Capabilities
- Use `geometry.ts` `superShape2D/3D` for level terrain generation
- Use `generative.ts` for Perlin noise terrain and particle systems
- Use `codevfx.ts` for visual effects (fire, ice, lightning on obstacles)
- Use `sdf.ts` for collision detection and terrain shaping
- Use `physics2d.ts` for simple platforming physics (adapted to 3D)

### Nav Item
Add to `nav-items.ts` WORKSPACE_ITEMS:
```typescript
{ label: 'Hypothesis Quest', href: '/hypothesis-quest', icon: 'Brain' }
```

## Implementation Steps

### Phase 1: Core Engine (files: chaos.ts, player.ts, camera.ts)
1. Implement Lorenz attractor integration (RK4 method)
2. Build third-person player controller with WASD movement
3. Create MOBA-style orbit camera (follow + orbit with mouse)
4. Add simple collision detection (AABB)

### Phase 2: World Generation (files: world.ts, levels/*.ts)
1. Build world generator that takes chaos state → 3D terrain
2. Implement Collatz level (spiral tower of number platforms)
3. Implement Goldbach level (prime orbs in space)
4. Implement Riemann level (complex plane landscape)
5. Implement P vs NP level (boolean gate maze)

### Phase 3: Butterfly Effect Visuals
1. Add Lorenz attractor trail visualization (particles following trajectory)
2. Implement "what-if" ghost system (shows alternative outcomes)
3. Add ripple effect when player makes decisions
4. Create dynamic weather/lighting based on chaos state

### Phase 4: UI & Integration
1. Create HUD overlay (React components)
2. Build main menu and level select
3. Register nav item
4. Add game-specific styles (Dark Obsidian theme)

### Phase 5: Polish & Testing
1. Add sound effects (procedural audio)
2. Implement save/load (localStorage)
3. Add educational tooltips explaining the math
4. Test all levels end-to-end

## Files to Touch
- NEW: `apps/web/src/app/(app)/hypothesis-quest/` (entire directory)
- EDIT: `apps/web/src/components/ide/nav-items.ts` (add nav item)
- EDIT: `apps/web/src/app/(app)/layout.tsx` (no changes needed — dynamic route)

## NO-Hacer
- NO modifiques archivos existentes fuera del scope
- NO agregues dependencias nuevas (Three.js ya está)
- NO rompas el build existente
- NO uses Pygame — esto es web con Three.js

## Verification
- `npm run typecheck` — passes
- `npm run lint` — passes
- `npm run test` — passes (2339+)
- `npm run build` — builds successfully, `/hypothesis-quest` in manifest
- Manual: open `/hypothesis-quest`, game loads, WASD movement works, levels are playable

## Effort
- ~8-10 hours of implementation
- Complexity: HIGH (3D + chaos math + game design)
- Priority: P1 (user explicitly requested)
