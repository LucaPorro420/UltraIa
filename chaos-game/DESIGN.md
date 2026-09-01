# Chaos Game — Design Document

## Core Concept

A **single-player exploration game** where the player interacts with deterministic
chaos. The "game" is the experience of discovering how tiny changes cascade into
macroscopic differences — the butterfly effect made tangible.

## Visual Design

### Theme: Deep Space Observatory
- **Background**: Near-black (#08080a) with subtle star field
- **Primary trajectory**: Neo Violet (#8b5cf6) with glow trail
- **Secondary trajectory**: Cyan (#06b6d4) with glow trail
- **Attractor wireframe**: Border-subtle (#1f1f2a) ghost lines
- **UI panels**: Glass panels (blur 12px + hairline top border)

### Typography
- **Headers**: Plus Jakarta Sans (display)
- **Data/numbers**: JetBrains Mono (mono)
- **Body**: Inter (functional)

### Motion
- Trail fading: opacity decay over last 500 points
- Divergence indicator: pulse animation when trajectories separate > threshold
- Camera: smooth orbit with damping

## Game Modes

### 1. Free Play (default)
- Select any attractor
- Adjust initial conditions with sliders
- Two trajectories run simultaneously
- Visual divergence indicator shows separation
- No win/lose — pure exploration

### 2. Challenge Mode
- Target region appears in 3D space
- Player adjusts initial conditions to steer trajectory toward target
- Score based on how small a perturbation achieves the goal
- Demonstrates sensitivity: tiny changes → huge outcome differences

### 3. Compare Mode
- Side-by-side or overlaid comparison of two attractors
- Same initial conditions, different dynamics
- Shows how different equations create different chaos

## Technical Decisions

### RK4 Integration (not Euler)
Euler method accumulates error fast in chaotic systems. RK4 provides much better
trajectory accuracy for the same step size. Step size dt=0.005 gives smooth curves
with 2000 points per trajectory.

### Fixed Step Count (not time-based)
Each frame advances exactly N integration steps. This ensures:
- Deterministic behavior (same seed → same path)
- Consistent visual density regardless of frame rate
- Easy comparison between runs

### Trail as BufferGeometry
Points are stored in a pre-allocated Float32Array buffer. New points shift old ones
out. This avoids garbage collection pauses and keeps rendering at 60fps.

### No Physics Engine
Three.js is used purely for rendering. The math is pure TypeScript — no cannon.js,
no rapier. The attractor equations are the "physics".

## Sensitivity Analysis

The game visualizes the **Lyapunov exponent** indirectly:
- Two trajectories start ε apart (ε ≈ 0.001)
- Distance d(t) grows exponentially: d(t) ≈ ε · e^(λt)
- When d(t) exceeds a threshold, the trajectories are "diverged"
- The divergence time depends on the attractor and initial conditions

## Future Extensions
- [ ] Lorenz '96 model (higher-dimensional chaos)
- [ ] Mandelbrot/Julia set navigation (complex plane chaos)
- [ ] Double pendulum (mechanical chaos)
- [ ] Cellular automata (discrete chaos)
- [ ] Multiplayer: two players control different trajectories
