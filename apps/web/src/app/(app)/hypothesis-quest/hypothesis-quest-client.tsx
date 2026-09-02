'use client';

/**
 * Hypothesis Quest 3D — Main game client.
 *
 * Architecture:
 *   5 screens managed by `screen` state: menu → level-select → playing ↔ paused → complete.
 *   During 'playing', a requestAnimationFrame loop drives Three.js rendering at 60fps.
 *   Each level is a class that owns its 3D objects and input handling.
 *   The chaos system (butterfly effect) randomizes terrain/collectibles per seed.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  createChaosState,
  stepChaos,
  chaosIntensity,
  ChaosState,
} from './engine/chaos';
import { PlayerController, PlayerState } from './engine/player';
import { CameraController } from './engine/camera';
import {
  createTerrain,
  generatePlatforms,
  generateCollectibles,
  generateObstacles,
  createGoal,
  animateWorldObjects,
  getCollisionBoxes,
  WorldObject,
} from './engine/world';

// Level classes — each owns its 3D objects, animation, and input handling.
import { CollatzLevel } from './engine/levels/collatz';
import { GoldbachLevel } from './engine/levels/goldbach';
import { RiemannLevel } from './engine/levels/riemann';
import { PvsNPLevel } from './engine/levels/pnp';
import { NavierStokesLevel } from './engine/levels/navier-stokes';
import { ConsciousnessLevel } from './engine/levels/consciousness';
import { HaltingLevel } from './engine/levels/halting';
import { TimeArrowLevel } from './engine/levels/time-arrow';
import { ProteinFoldingLevel } from './engine/levels/protein-folding';
import { PostQuantumCryptoLevel } from './engine/levels/post-quantum-crypto';

type GameScreen = 'menu' | 'level-select' | 'playing' | 'paused' | 'complete';
type LevelId = 'collatz' | 'goldbach' | 'riemann' | 'pnp'
  | 'navier-stokes' | 'consciousness' | 'halting'
  | 'time-arrow' | 'protein-folding' | 'post-quantum-crypto';

interface LevelInfo {
  id: LevelId;
  name: string;
  problem: string;
  description: string;
  color: string;
}

// Registry of all levels. To add a new level:
// 1. Create a class in engine/levels/ implementing generate() + animate() + dispose()
// 2. Import it, add its ID to LevelId, add its info here
// 3. Add a case in loadLevel()'s switch and keyboard handling in the keydown effect
const LEVELS: LevelInfo[] = [
  { id: 'collatz', name: 'Collatz Conjecture', problem: '3n + 1', description: 'Jump between number platforms following the Collatz rules. Can you always reach 1?', color: '#8b5cf6' },
  { id: 'goldbach', name: 'Goldbach Conjecture', problem: 'p + q = 2n', description: 'Find two primes that sum to the target even number.', color: '#2ecc71' },
  { id: 'riemann', name: 'Riemann Hypothesis', problem: 'ζ(s) = 0', description: 'Place zeros on the critical line in the complex plane.', color: '#3498db' },
  { id: 'pnp', name: 'P vs NP', problem: 'SAT', description: 'Toggle boolean switches to satisfy all clause gates.', color: '#e74c3c' },
  { id: 'navier-stokes', name: 'Navier-Stokes', problem: '∂u/∂t + (u·∇)u = ν∇²u − ∇p', description: 'Navigate a turbulent fluid field. Avoid vortices and collect pressure points to reach the exit.', color: '#1abc9c' },
  { id: 'consciousness', name: 'Consciousness', problem: 'Hard Problem', description: 'Connect brain regions in the correct sequence to create integrated conscious experience.', color: '#9b59b6' },
  { id: 'halting', name: 'Halting Problem', problem: 'P = halt?', description: 'Execute a program step by step. Determine if it halts or enters an infinite loop.', color: '#e67e22' },
  { id: 'time-arrow', name: 'Arrow of Time', problem: 'ΔS ≥ 0', description: 'Collect entropy fragments in a world where time periodically reverses. Use time reversal strategically.', color: '#2980b9' },
  { id: 'protein-folding', name: 'Protein Folding', problem: 'ΔG = ΔH − TΔS', description: 'Rotate amino acid segments to match the target 3D shape. Each rotation costs energy.', color: '#27ae60' },
  { id: 'post-quantum-crypto', name: 'Post-Quantum Crypto', problem: 'CVP(L, t)', description: 'Find the closest lattice point to a target vector. Basis vectors get harder each round.', color: '#c0392b' },
];

export default function HypothesisQuestClient() {
  // Three.js refs — mutable state that must not trigger React re-renders.
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const cameraCtrlRef = useRef<CameraController | null>(null);
  const chaosRef = useRef<ChaosState>(createChaosState());
  const worldObjectsRef = useRef<WorldObject[]>([]);
  const levelRef = useRef<CollatzLevel | GoldbachLevel | RiemannLevel | PvsNPLevel | NavierStokesLevel | ConsciousnessLevel | HaltingLevel | TimeArrowLevel | ProteinFoldingLevel | PostQuantumCryptoLevel | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const animFrameRef = useRef<number>(0);

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [currentLevel, setCurrentLevel] = useState<LevelId | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [chaosValue, setChaosValue] = useState(0);
  const [levelMessage, setLevelMessage] = useState('');

  // Boot Three.js once on mount. Returns a cleanup that removes the resize listener.
  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c10);
    scene.fog = new THREE.Fog(0x0c0c10, 30, 80);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    );
    const cameraCtrl = new CameraController(camera);
    cameraCtrlRef.current = cameraCtrl;

    // Three-light setup: ambient fill + directional key (with shadows) + hemisphere sky/ground tint.
    scene.add(new THREE.AmbientLight(0x404060, 0.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1);
    keyLight.position.set(20, 30, 20);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    scene.add(keyLight);

    scene.add(new THREE.HemisphereLight(0x8b5cf6, 0x111115, 0.3));

    const player = new PlayerController(scene, new THREE.Vector3(0, 3, -8));
    playerRef.current = player;

    const gridHelper = new THREE.GridHelper(100, 50, 0x1f1f2a, 0x1f1f2a);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load a level: clear old objects, generate terrain, instantiate the level class,
  // scatter collectibles/obstacles, place the goal, and reset the player.
  const loadLevel = useCallback((levelId: LevelId) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Tear down previous level
    worldObjectsRef.current.forEach((obj) => scene.remove(obj.mesh));
    worldObjectsRef.current = [];
    levelRef.current?.dispose();

    chaosRef.current = createChaosState();

    const terrain = createTerrain(scene, chaosRef.current);
    worldObjectsRef.current.push({ mesh: terrain, type: 'decoration', id: 'terrain', chaosIndex: -1 });

    // Instantiate the level class — each creates its own 3D objects in generate()
    let level: CollatzLevel | GoldbachLevel | RiemannLevel | PvsNPLevel | NavierStokesLevel | ConsciousnessLevel | HaltingLevel | TimeArrowLevel | ProteinFoldingLevel | PostQuantumCryptoLevel;
    switch (levelId) {
      case 'collatz': level = new CollatzLevel(scene, chaosRef.current.seed); break;
      case 'goldbach': level = new GoldbachLevel(scene, chaosRef.current.seed); break;
      case 'riemann': level = new RiemannLevel(scene, chaosRef.current.seed); break;
      case 'pnp': level = new PvsNPLevel(scene, chaosRef.current.seed); break;
      case 'navier-stokes': level = new NavierStokesLevel(scene, chaosRef.current.seed); break;
      case 'consciousness': level = new ConsciousnessLevel(scene, chaosRef.current.seed); break;
      case 'halting': level = new HaltingLevel(scene, chaosRef.current.seed); break;
      case 'time-arrow': level = new TimeArrowLevel(scene, chaosRef.current.seed); break;
      case 'protein-folding': level = new ProteinFoldingLevel(scene, chaosRef.current.seed); break;
      case 'post-quantum-crypto': level = new PostQuantumCryptoLevel(scene, chaosRef.current.seed); break;
    }
    levelRef.current = level;
    worldObjectsRef.current.push(...level.generate());

    worldObjectsRef.current.push(...generateCollectibles(scene, chaosRef.current.seed));
    worldObjectsRef.current.push(...generateObstacles(scene, chaosRef.current.seed));
    worldObjectsRef.current.push(createGoal(scene, new THREE.Vector3(0, 5, 20)));

    playerRef.current?.teleport(new THREE.Vector3(0, 3, -8));
    setCurrentLevel(levelId);
    setScreen('playing');
    setLevelMessage('');
    clockRef.current.start();
  }, []);

  // 60fps game loop: step chaos → physics → camera → animate → render.
  const gameLoop = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const player = playerRef.current;
    const cameraCtrl = cameraCtrlRef.current;
    if (!renderer || !scene || !player || !cameraCtrl) return;

    const delta = clockRef.current.getDelta();
    const time = clockRef.current.getElapsedTime();

    chaosRef.current = stepChaos(chaosRef.current, undefined, 1);
    setChaosValue(chaosIntensity(chaosRef.current));

    const platforms = getCollisionBoxes(worldObjectsRef.current);
    const newState = player.update(delta, platforms);
    setPlayerState(newState);

    cameraCtrl.update(newState.position, delta);
    animateWorldObjects(worldObjectsRef.current, chaosRef.current, time);
    levelRef.current?.animate(time);

    renderer.render(scene, cameraCtrl.getCamera());
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Boot Three.js on mount, tear down on unmount.
  useEffect(() => {
    const cleanup = initScene();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      rendererRef.current?.dispose();
      cleanup?.();
    };
  }, [initScene]);

  // Start/stop the animation loop when entering/leaving 'playing'.
  useEffect(() => {
    if (screen === 'playing') {
      animFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [screen, gameLoop]);

  // Level-specific keyboard input. Each level class exposes methods for its controls;
  // this effect dispatches key events to the active level via instanceof checks.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;

      if (e.code === 'Escape') {
        setScreen('paused');
        return;
      }

      // Riemann: arrow keys move cursor, Space places a zero
      if (levelRef.current instanceof RiemannLevel) {
        if (e.code === 'ArrowLeft') levelRef.current.moveCursor(-1, 0);
        if (e.code === 'ArrowRight') levelRef.current.moveCursor(1, 0);
        if (e.code === 'ArrowUp') levelRef.current.moveCursor(0, 1);
        if (e.code === 'ArrowDown') levelRef.current.moveCursor(0, -1);
        if (e.code === 'Space') {
          const ok = levelRef.current.placeZero();
          setLevelMessage(ok ? 'Zero placed correctly!' : 'Not on the critical line!');
        }
      }

      // P vs NP: number keys 1-4 toggle boolean variables
      if (levelRef.current instanceof PvsNPLevel) {
        if (e.code === 'Digit1') levelRef.current.toggleVariable(0);
        if (e.code === 'Digit2') levelRef.current.toggleVariable(1);
        if (e.code === 'Digit3') levelRef.current.toggleVariable(2);
        if (e.code === 'Digit4') levelRef.current.toggleVariable(3);
      }

      // Consciousness: number keys 1-6 activate brain regions in sequence
      if (levelRef.current instanceof ConsciousnessLevel) {
        const digit = parseInt(e.key);
        if (digit >= 1 && digit <= 6) {
          const ok = levelRef.current.activateRegion(digit - 1);
          setLevelMessage(ok ? 'Region activated!' : 'Wrong sequence! Integration dropped.');
        }
      }

      // Halting: Space = step, H = "halts", L = "loops forever"
      if (levelRef.current instanceof HaltingLevel) {
        if (e.code === 'Space') {
          levelRef.current.executeStep();
          const s = levelRef.current.getState();
          setLevelMessage(`Step ${s.currentStep}: PC=${s.programCounter}, R=${s.register}`);
          if (s.isComplete) setScreen('complete');
        }
        if (e.code === 'KeyH') {
          const ok = levelRef.current.makeDecision('halts');
          setLevelMessage(ok ? 'Correct! The program halts.' : 'Wrong! It loops forever.');
          setScreen('complete');
        }
        if (e.code === 'KeyL') {
          const ok = levelRef.current.makeDecision('loops');
          setLevelMessage(ok ? 'Correct! Infinite loop detected.' : 'Wrong! The program halts.');
          setScreen('complete');
        }
      }

      // Arrow of Time: R toggles time reversal
      if (levelRef.current instanceof TimeArrowLevel) {
        if (e.code === 'KeyR') {
          levelRef.current.toggleReverse();
          const s = levelRef.current.getState();
          setLevelMessage(s.timeReversed ? 'Time reversed!' : 'Time normal.');
        }
      }

      // Protein Folding: arrows select/rotate segments
      if (levelRef.current instanceof ProteinFoldingLevel) {
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          levelRef.current.selectSegment(e.code === 'ArrowLeft' ? 'left' : 'right');
        }
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          levelRef.current.rotateSegment(e.code === 'ArrowUp');
          const s = levelRef.current.getState();
          setLevelMessage(`Aligned: ${s.alignedCount}/${s.targetAligned} | Energy: ${s.energy}`);
          if (s.isComplete) setScreen('complete');
        }
      }

      // Post-Quantum Crypto: A/D adjust coeffA, W/S adjust coeffB
      if (levelRef.current instanceof PostQuantumCryptoLevel) {
        if (e.code === 'KeyA') levelRef.current.adjustA(-1);
        if (e.code === 'KeyD') levelRef.current.adjustA(1);
        if (e.code === 'KeyW') levelRef.current.adjustB(1);
        if (e.code === 'KeyS') levelRef.current.adjustB(-1);
        const s = levelRef.current.getState();
        setLevelMessage(`a=${s.coeffA} b=${s.coeffB} dist=${s.closestDistance.toFixed(2)} (threshold: ${s.threshold})`);
        if (s.isComplete) setScreen('complete');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  // Click the canvas to lock the pointer for 3D camera control (Escape to unlock).
  const handleContainerClick = useCallback(() => {
    if (screen === 'playing' && containerRef.current) {
      containerRef.current.requestPointerLock();
    }
  }, [screen]);

  return (
    <div className="relative w-full h-full bg-[#0c0c10]">
      {/* Three.js canvas container — renderer appends its <canvas> here */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
        onClick={handleContainerClick}
      />

      {/* HUD overlay — pointer-events-none so clicks pass through to the canvas */}
      {screen === 'playing' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="glass-panel px-4 py-2 rounded-lg">
              <div className="text-xs text-[#9a9aae] mb-1">Chaos Intensity</div>
              <div className="w-32 h-2 bg-[#1f1f2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#e74c3c] transition-all duration-300"
                  style={{ width: `${chaosValue * 100}%` }}
                />
              </div>
            </div>

            {playerState && (
              <div className="glass-panel px-4 py-2 rounded-lg text-right">
                <div className="text-sm text-[#e7e7ee]">Score: {playerState.score}</div>
                <div className="text-xs text-[#9a9aae]">
                  Health: {playerState.health}/{playerState.maxHealth}
                </div>
              </div>
            )}
          </div>

          {levelMessage && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-lg">
              <div className="text-[#e7e7ee]">{levelMessage}</div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-lg">
            <div className="text-xs text-[#9a9aae]">
              WASD: Move | Space: Jump/Step | 1-6: Interact | R: Time Reverse | ←↑↓→: Rotate | A/D/W/S: Adjust | H/L: Decide | Esc: Pause
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#9a9aae] text-sm opacity-50">
            Click to focus
          </div>
        </div>
      )}

      {screen === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/95">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-[#e7e7ee] mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Hypothesis Quest
            </h1>
            <p className="text-xl text-[#8b5cf6] mb-8">3D — Butterfly Effect Edition</p>
            <p className="text-[#9a9aae] mb-8 max-w-md mx-auto">
              Explore unsolved mathematical problems through interactive 3D worlds.
              Every playthrough is unique — the butterfly effect ensures no two journeys are the same.
            </p>
            <button
              onClick={() => setScreen('level-select')}
              className="px-8 py-3 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c4dff] transition-colors text-lg font-semibold"
            >
              Start Journey
            </button>
          </div>
        </div>
      )}

      {screen === 'level-select' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/95">
          <div className="max-w-2xl w-full px-4">
            <h2 className="text-3xl font-bold text-[#e7e7ee] mb-8 text-center" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Choose Your Problem
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => loadLevel(level.id)}
                  className="glass-panel p-6 rounded-lg text-left hover:border-[#8b5cf6] transition-all group"
                >
                  <div className="text-sm font-mono mb-2 opacity-70" style={{ color: level.color }}>
                    {level.problem}
                  </div>
                  <h3 className="text-lg font-semibold text-[#e7e7ee] mb-2 group-hover:text-[#8b5cf6] transition-colors">
                    {level.name}
                  </h3>
                  <p className="text-sm text-[#9a9aae]">{level.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setScreen('menu')}
              className="mt-6 px-6 py-2 text-[#9a9aae] hover:text-[#e7e7ee] transition-colors"
            >
              ← Back to Menu
            </button>
          </div>
        </div>
      )}

      {screen === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/90">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#e7e7ee] mb-8">Paused</h2>
            <div className="space-y-4">
              <button
                onClick={() => { setScreen('playing'); containerRef.current?.requestPointerLock(); }}
                className="block w-48 mx-auto px-6 py-3 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c4dff] transition-colors"
              >
                Resume
              </button>
              <button
                onClick={() => setScreen('level-select')}
                className="block w-48 mx-auto px-6 py-3 bg-[#1f1f2a] text-[#e7e7ee] rounded-lg hover:bg-[#26263a] transition-colors"
              >
                Level Select
              </button>
              <button
                onClick={() => setScreen('menu')}
                className="block w-48 mx-auto px-6 py-3 bg-[#1f1f2a] text-[#e7e7ee] rounded-lg hover:bg-[#26263a] transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/90">
          <div className="text-center glass-panel p-8 rounded-xl">
            <h2 className="text-3xl font-bold text-[#f1c40f] mb-4">Level Complete!</h2>
            <p className="text-[#e7e7ee] mb-2">
              You solved: {LEVELS.find((l) => l.id === currentLevel)?.name}
            </p>
            <p className="text-[#9a9aae] mb-6">Chaos seed: {chaosRef.current.seed}</p>
            <div className="space-y-4">
              <button
                onClick={() => setScreen('level-select')}
                className="block w-48 mx-auto px-6 py-3 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#7c4dff] transition-colors"
              >
                Next Level
              </button>
              <button
                onClick={() => setScreen('menu')}
                className="block w-48 mx-auto px-6 py-3 bg-[#1f1f2a] text-[#e7e7ee] rounded-lg hover:bg-[#26263a] transition-colors"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
