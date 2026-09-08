# VFX Course — UltraIa Learning

## Course Overview
Visual Effects course covering procedural code-based effects, 3D motion, and generative effects. Based on verified learning from UltraIa's codevfx and vfx capabilities.

## Module 1: Procedural Effect Principles (from `codevfx` capability)
### 1.1 Effect Definitions (9 kinds)
- **fire**: Simulated fire with upward movement, particle system, color gradient (orange→yellow→white)
- **ice**: Ice formation with downward fall, shattering effect, crystalline structure
- **lightning**: Branching electrical discharge, zigzag patterns, bright white/blue strokes
- **meteor**: Falling space debris, trailing smoke, gravity-affected motion
- **beam**: Directed energy line, constant velocity, glow effect, persistent
- **ground**: Ground impact effect, dust cloud, radial expansion, fading
- **void**: Inverse effect, negative space, distortion, heat haze
- **plasma**: Fluid plasma simulation, swirling patterns, color cycling
- **frost**: Frost formation, crystalline growth, cooling animation

### 1.2 Settings-as-API Tree
- **planEffect(kind, {intensity, speed})**: Planear efecto por kind
- **Preset deep-merge inmutable**: Presets inmutables, no override accidental
- **Spawn fraccional edit-while-paused**: Editar mientras el efecto está pausado
- **Máquina de fases**: windup → travel → impact → fade

### 1.3 Phase Machine
- **windup**: Energy accumulation phase
- **travel**: Effect propagation phase
- **impact**: Peak intensity phase
- **fade**: Decay and dissipation phase

### 1.4 Flicker and Restrike
- **Flicker**: Random brightness variation with personality-based noise
- **Restrike**: Re-ignition after fade, probability based on effect type
- **Crawl**: Horizontal scrolling effect for text or energy

### 1.5 GPU Ring-Buffer Specifications
- **Buffer depth**: Configurable per effect kind
- **Draw call budgets**: Per-frame draw call limits
- **ACES grade**: Academy Color Encoding System color space
- **Post-processing pipeline**: bloom/grade pipeline order

## Module 2: Colorimetry and Shading (from `codevfx`)
### 2.1 Color Analysis (HSL + Calor + Coherencia)
- **HSL analysis**: Hue, Saturation, Lightness breakdown
- **Calor parameter**: Heat/coherence factor (spread sat ≤35, calor ≤1.2)
- **Dominante por luminancia**: Primary color by luminance
- **Color palette base/acento/energía**: Base color, accent color, energy color

### 2.2 Curvature Shading (0-1)
- **Light direction**: `lightDir` affecting shading
- **Curvature (0-1)**: Surface curvature factor
- **Light/shade distribution**: How light falls on curved surfaces

### 2.3 Perspective and Planning
- **Perspective plan**: FOV from distance + parallax offsets per layer
- **Parallax layers**: Depth-based movement
- **FOV calculation**: Field of view from camera distance

### 2.4 GLSL Shaders (hand-written per kind)
- **9 kinds** each with custom GLSL shader
- **Uniforms**: intensity, speed, time, color parameters
- **Attributes**: per-particle data (position, age, velocity)
- **No texturas/sprites/meshes**: 100% code-generated

## Module 3: Effect Orchestration (from `codevfx` tool `vfx_code`)
### 3.1 Plan Reframe
- **planReframe**: Reframe effect for different canvas size
- **Aspect ratio preservation**: Maintain effect proportions
- **Resolution scaling**: Up/down scaling algorithms

### 3.2 Upscaling
- **planUpscale**: Scale effect to higher resolution
- **Quality preservation**: Maintain detail at larger sizes
- **Artifact reduction**: Minimize upscaling artifacts

### 3.3 LUT Matching
- **planLutMatch**: Match colors to reference LUT
- **Color consistency**: Across different effects and scenes
- **Artistic intent**: Preserve the original color grading

### 3.4 Rotoscoping
- **planRotoscope**: Isolate regions for selective effect application
- **Frame-by-frame**: Manual or automatic rotoscoping
- **Edge detection**: Clean boundary detection

### 3.5 Drawing to Edit
- **planDrawToEdit**: Draw freehand to modify effect regions
- **Ink/pen simulation**: Natural drawing feel
- **Region selection**: Select and modify specific effect areas

### 3.6 B-Roll Generation
- **planBroll**: Generate B-roll footage with effect parameters
- **Job definition**: missing beat, frame shape, motion need, transition
- **Clip duration**: Request clip ≥ duration for margin of cut

## Module 4: Advanced VFX Techniques
### 4.1 Noise by Personality
- **Personality-based noise**: Different noise patterns per character/personality
- **Seed per entity**: Reproducible noise per effect instance
- **Coherence over time**: Smooth noise transitions

### 4.2 Shape Hash
- **Effect shape identification**: Hash based on effect geometry
- **Duplicate detection**: Identify repeated effect patterns
- **Variation generation**: Generate variations on recognized shapes

### 4.3 Anti-Patterns
- **Decal angular**: Avoid angular decal artifacts
- **Shape hash validation**: Ensure shape consistency
- **Budget monitoring**: Draw call budgets, memory limits

### 4.4 GPU Optimization
- **Draw-call reduction**: Instancing, batching
- **Memory management**: Per-effect memory limits
- **Shader compilation caching**: Pre-compile and cache shaders

## Module 5: Integration with UltraIa Tools
### 5.1 Tool Integration
- **vfx_code tool**: 12 acciones nuevas (plan/reframe/upscale/lutmatch/roto/draw/broll/etc)
- **Export namespace**: `export * as vfx from './vfx'` (NO `export *`: tipos genéricos colisionan)
- **Demo**: `node_modules\.bin\vite-node.cmd Task/codevfx-demo.ts` → `resultTask/codevfx/`

### 5.2 Codevfx Demo Output
- **Plans**: 9 effect plans (fire/ice/lightning/meteor/beam/ground/void/plasma/frost)
- **Colorimetria**: HSL analysis per effect
- **Curvatura**: 0-1 shading parameter
- **Perspectiva**: FOV + parallax setup
- **Render HTML**: Canvas autocontenido (sin URLs, GLSL como comentario, reacciona a pointermove + hotkey)

### 5.3 Tests and Verification
- **codevfx.test.ts**: 29 PASS (verificado 17/08/2026)
- **Hardware requirements**: CPU-based computation, no GPU required for basic effects
- **Deterministic output**: Same input → same output (no randomness seed-dependent)