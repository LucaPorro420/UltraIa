'use client';

/**
 * Hypothesis Quest 3D — Main Game Client
 * Three.js-based 3D educational game with butterfly effect mechanics.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  createChaosState, 
  stepChaos, 
  chaosIntensity,
  ChaosState 
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
  WorldObject 
} from './engine/world';
import { CollatzLevel } from './engine/levels/collatz';
import { GoldbachLevel } from './engine/levels/goldbach';
import { RiemannLevel } from './engine/levels/riemann';
import { PvsNPLevel } from './engine/levels/pnp';

type GameScreen = 'menu' | 'level-select' | 'playing' | 'paused' | 'complete';
type LevelId = 'collatz' | 'goldbach' | 'riemann' | 'pnp';

interface LevelInfo {
  id: LevelId;
  name: string;
  problem: string;
  description: string;
  color: string;
}

const LEVELS: LevelInfo[] = [
  {
    id: 'collatz',
    name: 'Collatz Conjecture',
    problem: '3n + 1',
    description: 'Jump between number platforms following the Collatz rules. Can you always reach 1?',
    color: '#8b5cf6',
  },
  {
    id: 'goldbach',
    name: 'Goldbach Conjecture',
    problem: 'p + q = 2n',
    description: 'Find two primes that sum to the target even number.',
    color: '#2ecc71',
  },
  {
    id: 'riemann',
    name: 'Riemann Hypothesis',
    problem: 'ζ(s) = 0',
    description: 'Place zeros on the critical line in the complex plane.',
    color: '#3498db',
  },
  {
    id: 'pnp',
    name: 'P vs NP',
    problem: 'SAT',
    description: 'Toggle boolean switches to satisfy all clause gates.',
    color: '#e74c3c',
  },
];

export default function HypothesisQuestClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const cameraCtrlRef = useRef<CameraController | null>(null);
  const chaosRef = useRef<ChaosState>(createChaosState());
  const worldObjectsRef = useRef<WorldObject[]>([]);
  const levelRef = useRef<CollatzLevel | GoldbachLevel | RiemannLevel | PvsNPLevel | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const animFrameRef = useRef<number>(0);

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [currentLevel, setCurrentLevel] = useState<LevelId | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [chaosValue, setChaosValue] = useState(0);
  const [levelMessage, setLevelMessage] = useState('');

  // Initialize Three.js
  const initScene = useCallback(() => {
    if (!containerRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0c10);
    scene.fog = new THREE.Fog(0x0c0c10, 30, 80);
    sceneRef.current = scene;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    const cameraCtrl = new CameraController(camera);
    cameraCtrlRef.current = cameraCtrl;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(20, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    // Hemisphere light for ambient fill
    const hemiLight = new THREE.HemisphereLight(0x8b5cf6, 0x111115, 0.3);
    scene.add(hemiLight);

    // Player
    const player = new PlayerController(scene, new THREE.Vector3(0, 3, -8));
    playerRef.current = player;

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x1f1f2a, 0x1f1f2a);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Load a level
  const loadLevel = useCallback((levelId: LevelId) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous level
    worldObjectsRef.current.forEach(obj => {
      scene.remove(obj.mesh);
    });
    worldObjectsRef.current = [];
    if (levelRef.current) {
      levelRef.current.dispose();
    }

    // Create new chaos state for this level
    chaosRef.current = createChaosState();

    // Generate terrain
    const terrain = createTerrain(scene, chaosRef.current);
    worldObjectsRef.current.push({
      mesh: terrain,
      type: 'decoration',
      id: 'terrain',
      chaosIndex: -1,
    });

    // Load level-specific content
    let level: CollatzLevel | GoldbachLevel | RiemannLevel | PvsNPLevel;
    
    switch (levelId) {
      case 'collatz':
        level = new CollatzLevel(scene, chaosRef.current.seed);
        break;
      case 'goldbach':
        level = new GoldbachLevel(scene, chaosRef.current.seed);
        break;
      case 'riemann':
        level = new RiemannLevel(scene, chaosRef.current.seed);
        break;
      case 'pnp':
        level = new PvsNPLevel(scene, chaosRef.current.seed);
        break;
    }

    levelRef.current = level;
    const levelObjects = level.generate();
    worldObjectsRef.current.push(...levelObjects);

    // Add collectibles and obstacles
    const collectibles = generateCollectibles(scene, chaosRef.current.seed);
    worldObjectsRef.current.push(...collectibles);

    const obstacles = generateObstacles(scene, chaosRef.current.seed);
    worldObjectsRef.current.push(...obstacles);

    // Add goal
    const goal = createGoal(scene, new THREE.Vector3(0, 5, 20));
    worldObjectsRef.current.push(goal);

    // Reset player
    playerRef.current?.teleport(new THREE.Vector3(0, 3, -8));

    setCurrentLevel(levelId);
    setScreen('playing');
    setLevelMessage('');
    clockRef.current.start();
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const player = playerRef.current;
    const cameraCtrl = cameraCtrlRef.current;

    if (!renderer || !scene || !player || !cameraCtrl) return;

    const delta = clockRef.current.getDelta();
    const time = clockRef.current.getElapsedTime();

    // Step chaos
    chaosRef.current = stepChaos(chaosRef.current, undefined, 1);
    setChaosValue(chaosIntensity(chaosRef.current));

    // Get collision boxes
    const platforms = getCollisionBoxes(worldObjectsRef.current);

    // Update player
    const newPlayerState = player.update(delta, platforms);
    setPlayerState(newPlayerState);

    // Update camera
    cameraCtrl.update(newPlayerState.position, delta);

    // Animate world
    animateWorldObjects(worldObjectsRef.current, chaosRef.current, time);

    // Animate current level
    if (levelRef.current) {
      levelRef.current.animate(time);
    }

    // Render
    renderer.render(scene, cameraCtrl.getCamera());

    // Continue loop
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Start/stop game loop
  useEffect(() => {
    const cleanup = initScene();
    
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      cleanup?.();
    };
  }, [initScene]);

  useEffect(() => {
    if (screen === 'playing') {
      animFrameRef.current = requestAnimationFrame(gameLoop);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [screen, gameLoop]);

  // Handle keyboard input for level interactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;

      if (e.code === 'Escape') {
        setScreen('paused');
      }

      // Level-specific interactions
      if (levelRef.current instanceof RiemannLevel) {
        if (e.code === 'ArrowLeft') levelRef.current.moveCursor(-1, 0);
        if (e.code === 'ArrowRight') levelRef.current.moveCursor(1, 0);
        if (e.code === 'ArrowUp') levelRef.current.moveCursor(0, 1);
        if (e.code === 'ArrowDown') levelRef.current.moveCursor(0, -1);
        if (e.code === 'Space') {
          const success = levelRef.current.placeZero();
          if (success) {
            setLevelMessage('Zero placed correctly!');
          } else {
            setLevelMessage('Not on the critical line!');
          }
        }
      }

      if (levelRef.current instanceof PvsNPLevel) {
        if (e.code === 'Digit1') levelRef.current.toggleVariable(0);
        if (e.code === 'Digit2') levelRef.current.toggleVariable(1);
        if (e.code === 'Digit3') levelRef.current.toggleVariable(2);
        if (e.code === 'Digit4') levelRef.current.toggleVariable(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  // Request pointer lock on click
  const handleContainerClick = useCallback(() => {
    if (screen === 'playing' && containerRef.current) {
      containerRef.current.requestPointerLock();
    }
  }, [screen]);

  return (
    <div className="relative w-full h-full bg-[#0c0c10]">
      {/* Three.js Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-crosshair"
        onClick={handleContainerClick}
      />

      {/* HUD Overlay */}
      {screen === 'playing' && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bar */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            {/* Chaos meter */}
            <div className="glass-panel px-4 py-2 rounded-lg">
              <div className="text-xs text-[#9a9aae] mb-1">Chaos Intensity</div>
              <div className="w-32 h-2 bg-[#1f1f2a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#e74c3c] transition-all duration-300"
                  style={{ width: `${chaosValue * 100}%` }}
                />
              </div>
            </div>

            {/* Player info */}
            {playerState && (
              <div className="glass-panel px-4 py-2 rounded-lg text-right">
                <div className="text-sm text-[#e7e7ee]">Score: {playerState.score}</div>
                <div className="text-xs text-[#9a9aae]">
                  Health: {playerState.health}/{playerState.maxHealth}
                </div>
              </div>
            )}
          </div>

          {/* Level message */}
          {levelMessage && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 glass-panel px-6 py-3 rounded-lg">
              <div className="text-[#e7e7ee]">{levelMessage}</div>
            </div>
          )}

          {/* Controls hint */}
          <div className="absolute bottom-4 left-4 glass-panel px-4 py-2 rounded-lg">
            <div className="text-xs text-[#9a9aae]">
              WASD: Move | Space: Jump | Right-click: Orbit | Scroll: Zoom | Esc: Pause
            </div>
          </div>

          {/* Click to focus */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#9a9aae] text-sm opacity-50">
            Click to focus
          </div>
        </div>
      )}

      {/* Menu Screen */}
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

      {/* Level Select Screen */}
      {screen === 'level-select' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/95">
          <div className="max-w-2xl w-full px-4">
            <h2 className="text-3xl font-bold text-[#e7e7ee] mb-8 text-center" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Choose Your Problem
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => loadLevel(level.id)}
                  className="glass-panel p-6 rounded-lg text-left hover:border-[#8b5cf6] transition-all group"
                >
                  <div 
                    className="text-sm font-mono mb-2 opacity-70"
                    style={{ color: level.color }}
                  >
                    {level.problem}
                  </div>
                  <h3 className="text-lg font-semibold text-[#e7e7ee] mb-2 group-hover:text-[#8b5cf6] transition-colors">
                    {level.name}
                  </h3>
                  <p className="text-sm text-[#9a9aae]">
                    {level.description}
                  </p>
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

      {/* Pause Screen */}
      {screen === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/90">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#e7e7ee] mb-8">Paused</h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setScreen('playing');
                  containerRef.current?.requestPointerLock();
                }}
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

      {/* Level Complete Screen */}
      {screen === 'complete' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]/90">
          <div className="text-center glass-panel p-8 rounded-xl">
            <h2 className="text-3xl font-bold text-[#f1c40f] mb-4">Level Complete!</h2>
            <p className="text-[#e7e7ee] mb-2">
              You solved: {LEVELS.find(l => l.id === currentLevel)?.name}
            </p>
            <p className="text-[#9a9aae] mb-6">
              Chaos seed: {chaosRef.current.seed}
            </p>
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
