'use client';

import { useState } from 'react';
import { AttractorSelect } from './AttractorSelect';
import { InitialConditionSliders } from './InitialConditionSliders';
import { LiveMetrics } from './LiveMetrics';
import { DivergenceIndicator } from './DivergenceIndicator';
import type { StateVector } from '@ultraia/core';

interface ChaosGameClientProps {
  initialAttractor: string;
  initialIC: StateVector;
  initialEpsilon: number;
}

const ATTRACTOR_NAMES = ['lorenz', 'rossler', 'chen', 'aizawa'] as const;
const ATTRACTOR_LABELS: Record<string, string> = {
  lorenz: 'Lorenz (1963)',
  rossler: 'Rössler (1976)',
  chen: 'Chen (1999)',
  aizawa: 'Aizawa (2009)',
};

export function ChaosGameClient({
  initialAttractor,
  initialIC,
  initialEpsilon,
}: ChaosGameClientProps) {
  const [attractor, setAttractor] = useState(initialAttractor);
  const [primaryIC, setPrimaryIC] = useState<StateVector>([...initialIC]);
  const [epsilon, setEpsilon] = useState(initialEpsilon);
  const [running, setRunning] = useState(true);
  const [metrics, setMetrics] = useState({
    distance: 0,
    lyapunovEstimate: 0,
    elapsedTime: 0,
    fps: 60,
    primaryPoints: 0,
    secondaryPoints: 0,
  });
  const [diverged, setDiverged] = useState(false);

  const secondaryIC: StateVector = [
    primaryIC[0] + epsilon,
    primaryIC[1],
    primaryIC[2],
  ];

  const handleAttractorChange = (name: string) => {
    setAttractor(name);
    // Reset to default IC for new attractor
    const defaults: Record<string, StateVector> = {
      lorenz: [0.1, 0.0, 0.0],
      rossler: [0.1, 0.1, 0.1],
      chen: [-0.1, 0.5, -0.5],
      aizawa: [0.1, 0.0, 0.0],
    };
    setPrimaryIC([...defaults[name]]);
  };

  const handleICChange = (index: number, value: number) => {
    const newIC: StateVector = [
      index === 0 ? value : primaryIC[0],
      index === 1 ? value : primaryIC[1],
      index === 2 ? value : primaryIC[2],
    ];
    setPrimaryIC(newIC);
  };

  const handleEpsilonChange = (value: number) => {
    setEpsilon(value);
  };

  const handleToggleRunning = () => {
    setRunning(prev => !prev);
  };

  const handleReset = () => {
    const defaults: Record<string, StateVector> = {
      lorenz: [0.1, 0.0, 0.0],
      rossler: [0.1, 0.1, 0.1],
      chen: [-0.1, 0.5, -0.5],
      aizawa: [0.1, 0.0, 0.0],
    };
    setPrimaryIC([...defaults[attractor]]);
    setEpsilon(0.001);
    setRunning(true);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar - Glass Panel */}
      <aside className="w-80 flex-shrink-0 glass-panel p-4 overflow-y-auto border-r border-border-subtle">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Chaos Game</h2>
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                running ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {running ? 'Running' : 'Paused'}
            </span>
          </div>

          {/* Attractor Selector */}
          <AttractorSelect
            value={attractor}
            onChange={handleAttractorChange}
            options={ATTRACTOR_NAMES.map(n => ({ value: n, label: ATTRACTOR_LABELS[n] }))}
          />

          {/* Initial Condition Sliders */}
          <InitialConditionSliders
            ic={primaryIC}
            onChange={handleICChange}
            epsilon={epsilon}
            onEpsilonChange={handleEpsilonChange}
          />

          {/* Divergence Indicator */}
          <DivergenceIndicator diverged={diverged} distance={metrics.distance} />

          {/* Live Metrics */}
          <LiveMetrics metrics={metrics} />

          {/* Controls */}
          <div className="space-y-2 pt-4 border-t border-border-subtle">
            <button
              onClick={handleToggleRunning}
              className="w-full rounded-lg bg-primary/20 px-4 py-2 text-sm font-medium text-white hover:bg-primary/30 transition-colors"
            >
              {running ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={handleReset}
              className="w-full rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-neutral-300 hover:border-primary/50 hover:text-white transition-colors"
            >
              Reset Simulation
            </button>
          </div>

          {/* Info */}
          <div className="text-xs text-neutral-500 space-y-1">
            <p>Two trajectories start ε apart</p>
            <p className="font-mono">ε = {epsilon.toFixed(4)}</p>
            <p>Watch them diverge → butterfly effect</p>
          </div>
        </div>
      </aside>

      {/* Canvas */}
      <div className="flex-1 relative min-w-0">
        <canvas
          id="chaos-canvas"
          className="w-full h-full"
          // We'll use a custom hook or direct Three.js in a separate component
        />
        {/* The ChaosCanvas component will be mounted here via a portal or as a sibling */}
      </div>
    </div>
  );
}