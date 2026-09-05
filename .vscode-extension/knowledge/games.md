# Game Development Guide

## Game Architecture
```
Game Loop → Input → Update → Render → Audio → Network
    ↓
State Machine (Menu, Playing, Paused, GameOver)
    ↓
Entity Component System (ECS) or Scene Graph
```

## Core Systems
- **Input**: Keyboard, mouse, gamepad, touch, accelerometer
- **Physics**: Collision detection (AABB, SAT, spatial hash), rigid body, joints
- **Rendering**: Sprite batching, instancing, culling, LOD
- **Audio**: Spatial audio, music system, SFX pooling
- **AI**: Behavior trees, state machines, utility AI, GOAP
- **Pathfinding**: A*, navmesh, flow fields, steering behaviors
- **Networking**: Client prediction, server reconciliation, entity interpolation

## Engine-Specific

### Unity (C#)
```csharp
// Core Patterns
MonoBehaviour lifecycle: Awake → Start → Update → LateUpdate → OnDestroy
ScriptableObject: data containers, events, configs
Addressable Assets: async loading, memory management
UniTask: async/await for Unity
DOTS/ECS: high-performance entity system

// Tools
- Unity Editor: scene management, prefabs, ScriptableObjects
- Profiler: CPU, GPU, memory, audio
- Frame Debugger: step through rendering
- Test Runner: unit + integration tests
```

### Godot (GDScript/C#)
```gdscript
# Core Patterns
Node tree: scene composition
Signals: observer pattern (connect/signal)
Resources: data-driven design
Groups: tag-based queries

# Architecture
- Scene-based: each screen/entity is a scene
- Autoload: singletons (GameManager, EventBus)
- Custom Resources: data types with inspector
- Tool scripts: editor extensions
```

### Unreal Engine (C++)
```cpp
// Core Patterns
Actor-Component: entity-component system
Blueprints: visual scripting (prototyping)
Gameplay Ability System: complex ability framework
Mass Entity: ECS for large-scale simulation

// Systems
- Niagara: particle system
- Chaos Physics: destruction, ragdoll
- AI: Behavior Trees, EQS, Perception
- Animation: State Machine, Blend Spaces, Montages
```

## Procedural Generation
- **Terrain**: Perlin noise, diamond-square, erosion
- **Dungeons**: BSP, cellular automata, Wave Function Collapse
- **Loot Tables**: weighted random, pity timers
- **Textures**: noise functions, domain warping
- **Music**: Markov chains, chord progressions, BPM sync

## Game Math
- **Vectors**: position, direction, velocity, force
- **Matrices**: transformation, rotation, projection
- **Quaternions**: rotation without gimbal lock
- **Interpolation**: lerp, slerp, ease-in-out
- **Physics**: velocity Verlet, RK4 integration
- **Random**: seeded RNG, Gaussian distribution, noise

## Performance
- **Profiling**: frame time budget (16ms for 60fps)
- **Object Pooling**: reuse entities, avoid garbage
- **Spatial Partitioning**: quadtree, octree, grid
- **LOD**: level of detail for meshes/textures
- **Culling**: frustum, occlusion, distance
- **Batching**: reduce draw calls
- **Async**: loading, streaming, background tasks
