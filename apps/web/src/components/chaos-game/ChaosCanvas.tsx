'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { StateVector, TrailPoint } from '@ultraia/core';

interface ChaosCanvasProps {
  attractorName: string;
  primaryIC: StateVector;
  secondaryIC: StateVector;
  epsilon: number;
  onMetrics: (metrics: {
    distance: number;
    lyapunovEstimate: number;
    elapsedTime: number;
    fps: number;
    primaryPoints: number;
    secondaryPoints: number;
  }) => void;
  onDivergence: (diverged: boolean) => void;
  running: boolean;
}

const CHAOS_COLORS = {
  canvas: 0x08080a,
  primary: 0x8b5cf6,
  secondary: 0x06b6d4,
  wireframe: 0x1f1f2a,
  star: 0x3a3a4a,
} as const;

const TRAIL_MAX_POINTS = 5000;
const OPACITY_DECAY_WINDOW = 500;
const DIVERGENCE_THRESHOLD = 0.5;

export function ChaosCanvas({
  attractorName,
  primaryIC,
  secondaryIC,
  epsilon,
  onMetrics,
  onDivergence,
  running,
}: ChaosCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initialized, setInitialized] = useState(false);

  // Three.js objects refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Trail buffers
  const primaryBufferRef = useRef<Float32Array>(new Float32Array(TRAIL_MAX_POINTS * 4)); // x, y, z, alpha
  const secondaryBufferRef = useRef<Float32Array>(new Float32Array(TRAIL_MAX_POINTS * 4));
  const primaryCountRef = useRef(0);
  const secondaryCountRef = useRef(0);
  const primaryHeadRef = useRef(0);
  const secondaryHeadRef = useRef(0);

  // Line geometries
  const primaryLineRef = useRef<THREE.Line | null>(null);
  const secondaryLineRef = useRef<THREE.Line | null>(null);
  const wireframeLineRef = useRef<THREE.Line | null>(null);

  // Simulation state
  const primaryStateRef = useRef<StateVector>([...primaryIC]);
  const secondaryStateRef = useRef<StateVector>([...secondaryIC]);
  const frameCounterRef = useRef(0);
  const elapsedTimeRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // RK4 config
  const DT = 0.005;
  const STEPS_PER_FRAME = 10;

  // Get attractor ODE function
  const getODE = (name: string) => {
    // These match the core implementations
    switch (name) {
      case 'lorenz': {
        const sigma = 10, rho = 28, beta = 8 / 3;
        return (state: StateVector): StateVector => {
          const [x, y, z] = state;
          return [
            sigma * (y - x),
            x * (rho - z) - y,
            x * y - beta * z,
          ];
        };
      }
      case 'rossler': {
        const a = 0.2, b = 0.2, c = 5.7;
        return (state: StateVector): StateVector => {
          const [x, y, z] = state;
          return [-y - z, x + a * y, b + z * (x - c)];
        };
      }
      case 'chen': {
        const a = 35, b = 3, c = 28;
        return (state: StateVector): StateVector => {
          const [x, y, z] = state;
          return [a * (y - x), (c - a) * x - x * z + c * y, x * y - b * z];
        };
      }
      case 'aizawa': {
        const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
        return (state: StateVector): StateVector => {
          const [x, y, z] = state;
          const xz = x * z;
          return [
            (z - b) * x - d * y,
            d * x + (z - b) * y,
            c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * xz,
          ];
        };
      }
      default:
        throw new Error(`Unknown attractor: ${name}`);
    }
  };

  const ode = getODE(attractorName);

  const rk4Step = (state: StateVector): StateVector => {
    const [x, y, z] = state;
    const k1 = ode(state);
    const k2 = ode([x + DT * 0.5 * k1[0], y + DT * 0.5 * k1[1], z + DT * 0.5 * k1[2]]);
    const k3 = ode([x + DT * 0.5 * k2[0], y + DT * 0.5 * k2[1], z + DT * 0.5 * k2[2]]);
    const k4 = ode([x + DT * k3[0], y + DT * k3[1], z + DT * k3[2]]);
    const inv6 = 1 / 6;
    return [
      x + DT * inv6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      y + DT * inv6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      z + DT * inv6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    ];
  };

  // Initialize Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(CHAOS_COLORS.canvas, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.autoRotate = false;
    controlsRef.current = controls;

    // Star field
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 20 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: CHAOS_COLORS.star,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Primary trail line
    const primaryLineGeometry = new THREE.BufferGeometry();
    primaryLineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(primaryBufferRef.current, 3)
    );
    primaryLineGeometry.setAttribute(
      'alpha',
      new THREE.BufferAttribute(new Float32Array(TRAIL_MAX_POINTS), 1)
    );
    primaryLineGeometry.setDrawRange(0, 0);

    const primaryLineMaterial = new THREE.LineBasicMaterial({
      color: CHAOS_COLORS.primary,
      transparent: true,
      opacity: 1,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
    });

    const primaryLine = new THREE.Line(primaryLineGeometry, primaryLineMaterial);
    scene.add(primaryLine);
    primaryLineRef.current = primaryLine;

    // Secondary trail line
    const secondaryLineGeometry = new THREE.BufferGeometry();
    secondaryLineGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(secondaryBufferRef.current, 3)
    );
    secondaryLineGeometry.setAttribute(
      'alpha',
      new THREE.BufferAttribute(new Float32Array(TRAIL_MAX_POINTS), 1)
    );
    secondaryLineGeometry.setDrawRange(0, 0);

    const secondaryLineMaterial = new THREE.LineBasicMaterial({
      color: CHAOS_COLORS.secondary,
      transparent: true,
      opacity: 1,
      vertexColors: false,
      blending: THREE.AdditiveBlending,
    });

    const secondaryLine = new THREE.Line(secondaryLineGeometry, secondaryLineMaterial);
    scene.add(secondaryLine);
    secondaryLineRef.current = secondaryLine;

    // Attractor wireframe (pre-computed reference trajectory)
    const wireframeGeometry = new THREE.BufferGeometry();
    const wireframePoints: number[] = [];
    let wState: StateVector = [...primaryIC];
    for (let i = 0; i < 2000; i++) {
      wState = rk4Step(wState);
      wireframePoints.push(wState[0], wState[1], wState[2]);
    }
    wireframeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(wireframePoints, 3)
    );
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: CHAOS_COLORS.wireframe,
      transparent: true,
      opacity: 0.15,
    });
    const wireframeLine = new THREE.Line(wireframeGeometry, wireframeMaterial);
    scene.add(wireframeLine);
    wireframeLineRef.current = wireframeLine;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Point lights for glow effect
    const light1 = new THREE.PointLight(CHAOS_COLORS.primary, 0.5, 30);
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(CHAOS_COLORS.secondary, 0.5, 30);
    light2.position.set(-5, -5, -5);
    scene.add(light2);

    // Resize handler
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationId: number;
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let fps = 60;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastFrameTime) / 1000;
      lastFrameTime = currentTime;

      // FPS calculation
      frameCount++;
      if (frameCount % 30 === 0) {
        fps = Math.round(30 / (currentTime / 1000 - elapsedTimeRef.current));
        elapsedTimeRef.current = currentTime / 1000;
      }

      if (running) {
        // Advance simulation
        for (let step = 0; step < STEPS_PER_FRAME; step++) {
          primaryStateRef.current = rk4Step(primaryStateRef.current);
          secondaryStateRef.current = rk4Step(secondaryStateRef.current);
        }

        const [px, py, pz] = primaryStateRef.current;
        const [sx, sy, sz] = secondaryStateRef.current;

        // Add to primary buffer
        const pIdx = primaryHeadRef.current * 4;
        primaryBufferRef.current[pIdx] = px;
        primaryBufferRef.current[pIdx + 1] = py;
        primaryBufferRef.current[pIdx + 2] = pz;
        primaryBufferRef.current[pIdx + 3] = 1.0;
        primaryHeadRef.current = (primaryHeadRef.current + 1) % TRAIL_MAX_POINTS;
        primaryCountRef.current = Math.min(primaryCountRef.current + 1, TRAIL_MAX_POINTS);

        // Add to secondary buffer
        const sIdx = secondaryHeadRef.current * 4;
        secondaryBufferRef.current[sIdx] = sx;
        secondaryBufferRef.current[sIdx + 1] = sy;
        secondaryBufferRef.current[sIdx + 2] = sz;
        secondaryBufferRef.current[sIdx + 3] = 1.0;
        secondaryHeadRef.current = (secondaryHeadRef.current + 1) % TRAIL_MAX_POINTS;
        secondaryCountRef.current = Math.min(secondaryCountRef.current + 1, TRAIL_MAX_POINTS);

        // Update alpha decay for primary
        const pPosAttr = primaryLineGeometry.getAttribute('position') as THREE.BufferAttribute;
        const pAlphaAttr = primaryLineGeometry.getAttribute('alpha') as THREE.BufferAttribute;
        const oldestP = primaryCountRef.current === TRAIL_MAX_POINTS ? primaryHeadRef.current : 0;

        for (let i = 0; i < primaryCountRef.current; i++) {
          const srcIdx = (oldestP + i) % TRAIL_MAX_POINTS;
          const age = primaryCountRef.current - 1 - i;
          const alpha = age < OPACITY_DECAY_WINDOW
            ? Math.pow(0.995, age)
            : 0;
          pAlphaAttr.setX(srcIdx, alpha);
        }
        pAlphaAttr.needsUpdate = true;
        pPosAttr.needsUpdate = true;
        primaryLineGeometry.setDrawRange(0, primaryCountRef.current);

        // Update alpha decay for secondary
        const sPosAttr = secondaryLineGeometry.getAttribute('position') as THREE.BufferAttribute;
        const sAlphaAttr = secondaryLineGeometry.getAttribute('alpha') as THREE.BufferAttribute;
        const oldestS = secondaryCountRef.current === TRAIL_MAX_POINTS ? secondaryHeadRef.current : 0;

        for (let i = 0; i < secondaryCountRef.current; i++) {
          const srcIdx = (oldestS + i) % TRAIL_MAX_POINTS;
          const age = secondaryCountRef.current - 1 - i;
          const alpha = age < OPACITY_DECAY_WINDOW
            ? Math.pow(0.995, age)
            : 0;
          sAlphaAttr.setX(srcIdx, alpha);
        }
        sAlphaAttr.needsUpdate = true;
        sPosAttr.needsUpdate = true;
        secondaryLineGeometry.setDrawRange(0, secondaryCountRef.current);

        // Calculate metrics
        const dx = px - sx;
        const dy = py - sy;
        const dz = pz - sz;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const elapsedTime = frameCounterRef.current * DT * STEPS_PER_FRAME;
        const lyapunovEstimate = elapsedTime > 0 && distance > 0
          ? Math.log(distance / epsilon) / elapsedTime
          : 0;
        const diverged = distance > DIVERGENCE_THRESHOLD;

        onMetrics({
          distance,
          lyapunovEstimate,
          elapsedTime,
          fps,
          primaryPoints: primaryCountRef.current,
          secondaryPoints: secondaryCountRef.current,
        });
        onDivergence(diverged);
      }

      controls.update();

      if (reduced) {
        // Static render for reduced motion
        renderer.render(scene, camera);
      } else {
        renderer.render(scene, camera);
      }

      frameCounterRef.current++;
      animationId = requestAnimationFrame(animate);
    };

    if (reduced) {
      renderer.render(scene, camera);
    } else {
      animationId = requestAnimationFrame(animate);
    }

    setInitialized(true);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);

      // Dispose Three.js resources
      starGeometry.dispose();
      starMaterial.dispose();
      primaryLineGeometry.dispose();
      primaryLineMaterial.dispose();
      secondaryLineGeometry.dispose();
      secondaryLineMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      renderer.dispose();
      controls.dispose();
    };
  }, [attractorName, primaryIC, secondaryIC, epsilon, running]);

  // Sync IC changes
  useEffect(() => {
    primaryStateRef.current = [...primaryIC];
    secondaryStateRef.current = [...secondaryIC];
    primaryHeadRef.current = 0;
    secondaryHeadRef.current = 0;
    primaryCountRef.current = 0;
    secondaryCountRef.current = 0;
    frameCounterRef.current = 0;
    elapsedTimeRef.current = 0;
  }, [primaryIC, secondaryIC, attractorName]);

  if (!initialized) {
    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-label="Chaos Game - Loading..."
      />
    );
  }

  return <canvas ref={canvasRef} className="w-full h-full" aria-label="Chaos Game - Attractor visualization" />;
}