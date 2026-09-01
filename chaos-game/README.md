# Chaos Game — 3D Butterfly Effect Explorer

> "Does the flap of a butterfly's wings in Brazil set off a tornado in Texas?"
> — Edward Lorenz, 1972

An interactive 3D visualization of chaos theory and the butterfly effect. Explore how
infinitesimally small changes in initial conditions lead to vastly different outcomes
in deterministic nonlinear systems.

## What It Does

- **4 Strange Attractors**: Lorenz, Rössler, Thomas, Halvorsen — each with unique topology
- **Dual Trajectory Comparison**: Run two trajectories with slightly different starting points
  and watch them diverge in real time
- **Interactive 3D**: Orbit controls, zoom, pan — explore the attractor from any angle
- **Initial Condition Tuning**: Sliders to perturb x/y/z starting coordinates by ±0.001
- **Challenge Mode**: Guess which trajectory will reach a target region first
- **Free Play Mode**: Pure exploration with trail visualization

## Tech Stack

- **Three.js** (r152) — 3D rendering, OrbitControls
- **React 19** — client component with hooks
- **TypeScript** — strict mode, zero deps beyond React/Three.js
- **CSS** — Dark Obsidian theme, no Tailwind for game canvas

## Architecture

```
chaos-game/
├── README.md              ← this file
├── DESIGN.md              ← design decisions & math reference
apps/web/src/app/(app)/
└── chaos-game/
    ├── page.tsx            ← server component (metadata)
    ├── chaos-game-client.tsx ← main client component
    ├── engine/
    │   ├── attractors.ts   ← Lorenz/Rossler/Thomas/Halvorsen math
    │   ├── integrator.ts   ← RK4 numerical integrator
    │   └── renderer.ts     ← Three.js scene setup + animation
    └── styles/
        └── chaos-game.css  ← Dark Obsidian theme
```

## Math Reference

### Lorenz Attractor (1963)
```
dx/dt = σ(y - x)
dy/dt = x(ρ - z) - y
dz/dt = xy - βz
```
Classic parameters: σ=10, ρ=28, β=8/3. Sensitive dependence on initial conditions.

### Rössler Attractor (1976)
```
dx/dt = -y - z
dy/dt = x + ay
dz/dt = b + z(x - c)
```
Parameters: a=0.2, b=0.2, c=5.7. Simpler topology, clear period-doubling route to chaos.

### Thomas Attractor (1984)
```
dx/dt = sin(y) - bx
dy/dt = sin(z) - by
dz/dt = sin(x) - bz
```
Parameter: b=0.208186. Symmetric, knot-like structure.

### Halvorsen Attractor (1984)
```
dx/dt = -ax - 4y - 4z - y²
dy/dt = -ay - 4z - 4x - z²
dz/dt = -az - 4x - 4y - x²
```
Parameter: a=1.89. Highly symmetric, cyclically permuted equations.

## How to Run

The game is part of the UltraIa web app:

```bash
npm run dev          # start dev server
# Navigate to /chaos-game
```

## Controls

| Key | Action |
|-----|--------|
| Mouse drag | Orbit camera |
| Scroll | Zoom in/out |
| Right-click drag | Pan |
| Space | Pause/Resume simulation |
| R | Reset to initial conditions |
| Tab | Switch between attractors |
| 1/2/3/4 | Select attractor directly |
