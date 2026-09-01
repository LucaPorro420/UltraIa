/**
 * chaos-game-client.tsx — Main client component for the Chaos Game.
 *
 * Interactive 3D visualization of strange attractors with dual trajectory
 * comparison to demonstrate the butterfly effect.
 *
 * Uses dynamic import for Three.js (SSR-safe).
 */

'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ATTRACTORS,
  getAttractor,
  type AttractorDef,
} from './engine/attractors';
import { integrate, stepRK4, distance3D, type IntegrationState } from './engine/integrator';
import './styles/chaos-game.css';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DT = 0.005;
const MAX_POINTS = 2000;
const INITIAL_PERTURBATION = 0.001;
const DIVERGENCE_THRESHOLD = 5.0;
const STEPS_PER_FRAME = 4;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type GameMode = 'freeplay' | 'challenge' | 'compare';

interface SimulationState {
  running: boolean;
  attractorId: string;
  mode: GameMode;
  /** Primary trajectory initial conditions. */
  primaryInitial: [number, number, number];
  /** Secondary trajectory: primary + perturbation. */
  secondaryInitial: [number, number, number];
  /** Current integration states. */
  primaryState: IntegrationState;
  secondaryState: IntegrationState;
  /** Accumulated trail points. */
  primaryTrail: [number, number, number][];
  secondaryTrail: [number, number, number][];
  /** Whether trajectories have diverged. */
  diverged: boolean;
  /** Divergence distance. */
  divergenceDistance: number;
  /** Frame counter. */
  frameCount: number;
  /** Attractor parameters. */
  params: Record<string, number>;
  /** Perturbation per axis. */
  perturbation: [number, number, number];
}

/* ------------------------------------------------------------------ */
/* Initial state factory                                               */
/* ------------------------------------------------------------------ */

function createInitialState(attractorId: string): SimulationState {
  const attractor = getAttractor(attractorId);
  const initial = [...attractor.meta.initial] as [number, number, number];
  const perturbation: [number, number, number] = [INITIAL_PERTURBATION, 0, 0];

  return {
    running: true,
    attractorId,
    mode: 'freeplay',
    primaryInitial: [...initial],
    secondaryInitial: [
      initial[0] + perturbation[0],
      initial[1] + perturbation[1],
      initial[2] + perturbation[2],
    ],
    primaryState: { x: initial[0], y: initial[1], z: initial[2], t: 0 },
    secondaryState: {
      x: initial[0] + perturbation[0],
      y: initial[1] + perturbation[1],
      z: initial[2] + perturbation[2],
      t: 0,
    },
    primaryTrail: [],
    secondaryTrail: [],
    diverged: false,
    divergenceDistance: 0,
    frameCount: 0,
    params: { ...attractor.meta.defaults },
    perturbation,
  };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ChaosGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef<SimulationState>(createInitialState('lorenz'));

  const [attractorId, setAttractorId] = useState('lorenz');
  const [running, setRunning] = useState(true);
  const [diverged, setDiverged] = useState(false);
  const [divergenceDist, setDivergenceDist] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [perturbation, setPerturbation] = useState<[number, number, number]>([
    INITIAL_PERTURBATION, 0, 0,
  ]);
  const [params, setParams] = useState<Record<string, number>>(
    () => getAttractor('lorenz').meta.defaults,
  );
  const [mode, setMode] = useState<GameMode>('freeplay');
  const [initialized, setInitialized] = useState(false);

  /* ---- Initialize Three.js scene ---- */
  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;

    (async () => {
      const { createChaosScene, renderFrame } = await import('./engine/renderer');
      if (disposed || !containerRef.current) return;

      const scene = await createChaosScene(containerRef.current);
      if (disposed) {
        scene.dispose();
        return;
      }

      sceneRef.current = scene;
      setInitialized(true);

      // Start render loop
      const animate = () => {
        if (disposed) return;
        renderFrame(scene);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  /* ---- Simulation step ---- */
  const stepSimulation = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    const attractor = getAttractor(s.attractorId);
    const fn = attractor.fn;

    // Advance N steps per frame
    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      s.primaryState = stepRK4(fn, s.params, s.primaryState, DT);
      s.secondaryState = stepRK4(fn, s.params, s.secondaryState, DT);
    }

    // Add to trails
    s.primaryTrail.push([s.primaryState.x, s.primaryState.y, s.primaryState.z]);
    s.secondaryTrail.push([s.secondaryState.x, s.secondaryState.y, s.secondaryState.z]);

    // Trim trails
    if (s.primaryTrail.length > MAX_POINTS) {
      s.primaryTrail = s.primaryTrail.slice(-MAX_POINTS);
      s.secondaryTrail = s.secondaryTrail.slice(-MAX_POINTS);
    }

    // Compute divergence
    const dist = distance3D(
      [s.primaryState.x, s.primaryState.y, s.primaryState.z],
      [s.secondaryState.x, s.secondaryState.y, s.secondaryState.z],
    );
    s.divergenceDistance = dist;
    s.diverged = dist > DIVERGENCE_THRESHOLD;
    s.frameCount++;

    // Update React state (throttled)
    if (s.frameCount % 3 === 0) {
      setDiverged(s.diverged);
      setDivergenceDist(dist);
      setFrameCount(s.frameCount);
    }

    // Update Three.js trails
    if (sceneRef.current) {
      import('./engine/renderer').then(({ updateTrails }) => {
        updateTrails(sceneRef.current, {
          primary: s.primaryTrail,
          secondary: s.secondaryTrail,
          scale: attractor.meta.scale,
          diverged: s.diverged,
        });
      });
    }
  }, []);

  /* ---- Animation loop ---- */
  useEffect(() => {
    if (!initialized) return;

    let raf: number;
    const loop = () => {
      stepSimulation();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, [initialized, stepSimulation]);

  /* ---- Actions ---- */
  const switchAttractor = useCallback((id: string) => {
    const s = createInitialState(id);
    stateRef.current = s;
    setAttractorId(id);
    setParams({ ...s.params });
    setPerturbation([...s.perturbation]);
    setDiverged(false);
    setDivergenceDist(0);
    setFrameCount(0);
    setRunning(true);
  }, []);

  const reset = useCallback(() => {
    const s = stateRef.current;
    const fresh = createInitialState(s.attractorId);
    fresh.params = { ...s.params };
    fresh.perturbation = [...s.perturbation];
    fresh.primaryInitial = [...s.primaryInitial];
    fresh.secondaryInitial = [
      s.primaryInitial[0] + s.perturbation[0],
      s.primaryInitial[1] + s.perturbation[1],
      s.primaryInitial[2] + s.perturbation[2],
    ];
    fresh.primaryState = { x: s.primaryInitial[0], y: s.primaryInitial[1], z: s.primaryInitial[2], t: 0 };
    fresh.secondaryState = {
      x: s.secondaryInitial[0],
      y: s.secondaryInitial[1],
      z: s.secondaryInitial[2],
      t: 0,
    };
    stateRef.current = fresh;
    setDiverged(false);
    setDivergenceDist(0);
    setFrameCount(0);
    setRunning(true);
  }, []);

  const togglePause = useCallback(() => {
    stateRef.current.running = !stateRef.current.running;
    setRunning(stateRef.current.running);
  }, []);

  const updatePerturbation = useCallback((axis: 0 | 1 | 2, value: number) => {
    const s = stateRef.current;
    s.perturbation[axis] = value;
    s.secondaryInitial = [
      s.primaryInitial[0] + s.perturbation[0],
      s.primaryInitial[1] + s.perturbation[1],
      s.primaryInitial[2] + s.perturbation[2],
    ];
    setPerturbation([...s.perturbation]);
  }, []);

  const updateParam = useCallback((name: string, value: number) => {
    const s = stateRef.current;
    s.params[name] = value;
    setParams({ ...s.params });
  }, []);

  /* ---- Keyboard shortcuts ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        case 'r':
        case 'R':
          reset();
          break;
        case '1':
          switchAttractor('lorenz');
          break;
        case '2':
          switchAttractor('rossler');
          break;
        case '3':
          switchAttractor('thomas');
          break;
        case '4':
          switchAttractor('halvorsen');
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePause, reset, switchAttractor]);

  /* ---- Derived values ---- */
  const attractor = getAttractor(attractorId);
  const divergencePercent = Math.min(100, (divergenceDist / DIVERGENCE_THRESHOLD) * 100);
  const divergeColor = diverged ? '#ef4444' : '#8b5cf6';

  return (
    <div className="chaos-container">
      {/* 3D Canvas */}
      <div ref={containerRef} className="chaos-canvas" />

      {!initialized && (
        <div className="chaos-loading">Initializing 3D engine</div>
      )}

      {/* Overlay UI */}
      <div className="chaos-overlay">
        {/* Top bar */}
        <div className="chaos-top-bar">
          <span className="chaos-title">Chaos Game</span>
          <span className="chaos-badge">{attractor.meta.name}</span>
          <span className="chaos-badge">RK4 dt={DT}</span>
        </div>

        {/* Control panel */}
        <div className="chaos-controls">
          {/* Attractor selector */}
          <div>
            <div className="chaos-section-label">Attractor</div>
            <div className="chaos-attractor-grid">
              {ATTRACTORS.map((a) => (
                <button
                  key={a.id}
                  className={`chaos-attractor-btn ${a.id === attractorId ? 'active' : ''}`}
                  onClick={() => switchAttractor(a.id)}
                >
                  {a.meta.name}
                </button>
              ))}
            </div>
          </div>

          {/* Initial conditions */}
          <div>
            <div className="chaos-section-label">Initial Conditions (Primary)</div>
            {(['x', 'y', 'z'] as const).map((axis, i) => (
              <div key={axis} className="chaos-slider-row">
                <span className="chaos-slider-label">{axis}</span>
                <input
                  type="range"
                  className="chaos-slider"
                  min={-20}
                  max={20}
                  step={0.1}
                  value={stateRef.current.primaryInitial[i]}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    stateRef.current.primaryInitial[i] = val;
                    updatePerturbation(i as 0 | 1 | 2, stateRef.current.perturbation[i as 0 | 1 | 2]);
                  }}
                />
                <span className="chaos-slider-value">
                  {stateRef.current.primaryInitial[i].toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Perturbation */}
          <div>
            <div className="chaos-section-label">
              Perturbation (Secondary Offset)
            </div>
            {(['x', 'y', 'z'] as const).map((axis, i) => (
              <div key={axis} className="chaos-slider-row">
                <span className="chaos-slider-label">d{axis}</span>
                <input
                  type="range"
                  className="chaos-slider"
                  min={-0.01}
                  max={0.01}
                  step={0.0001}
                  value={perturbation[i]}
                  onChange={(e) => updatePerturbation(i as 0 | 1 | 2, parseFloat(e.target.value))}
                />
                <span className="chaos-slider-value">
                  {perturbation[i].toFixed(4)}
                </span>
              </div>
            ))}
          </div>

          {/* Attractor parameters */}
          <div>
            <div className="chaos-section-label">Parameters</div>
            {Object.entries(attractor.meta.ranges).map(([name, [min, max]]) => (
              <div key={name} className="chaos-slider-row">
                <span className="chaos-slider-label">{name}</span>
                <input
                  type="range"
                  className="chaos-slider"
                  min={min}
                  max={max}
                  step={(max - min) / 200}
                  value={params[name] ?? attractor.meta.defaults[name]}
                  onChange={(e) => updateParam(name, parseFloat(e.target.value))}
                />
                <span className="chaos-slider-value">
                  {(params[name] ?? attractor.meta.defaults[name]).toFixed(3)}
                </span>
              </div>
            ))}
          </div>

          {/* Divergence indicator */}
          <div className="chaos-divergence">
            <span className="chaos-divergence-label">
              {diverged ? 'DIVERGED' : 'Tracking'}
            </span>
            <div className="chaos-divergence-bar">
              <div
                className="chaos-divergence-fill"
                style={{
                  width: `${divergencePercent}%`,
                  background: divergeColor,
                }}
              />
            </div>
            <span className="chaos-slider-value">
              {divergenceDist.toFixed(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="chaos-actions">
            <button className="chaos-action-btn primary" onClick={togglePause}>
              {running ? 'Pause' : 'Resume'}
            </button>
            <button className="chaos-action-btn" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="chaos-stats">
          <div className="chaos-stat">
            <span className="chaos-stat-label">Points</span>
            <span className="chaos-stat-value">
              {stateRef.current.primaryTrail.length.toLocaleString()}
            </span>
          </div>
          <div className="chaos-stat">
            <span className="chaos-stat-label">Time</span>
            <span className="chaos-stat-value">
              {(stateRef.current.primaryState.t).toFixed(1)}
            </span>
          </div>
          <div className="chaos-stat">
            <span className="chaos-stat-label">Distance</span>
            <span className="chaos-stat-value" style={{ color: divergeColor }}>
              {divergenceDist.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="chaos-hints">
          <span className="chaos-hint"><kbd>Space</kbd> pause</span>
          <span className="chaos-hint"><kbd>R</kbd> reset</span>
          <span className="chaos-hint"><kbd>1-4</kbd> attractor</span>
          <span className="chaos-hint"><kbd>drag</kbd> orbit</span>
        </div>

        {/* Pause indicator */}
        {!running && <div className="chaos-paused">PAUSED</div>}
      </div>
    </div>
  );
}
