/**
 * renderer.ts — Three.js scene setup for the Chaos Game.
 *
 * Creates the 3D visualization: two trajectories as glowing lines,
 * orbit controls, ambient lighting, and a subtle grid.
 *
 * Uses dynamic import for Three.js (SSR-safe).
 */

'use client';

import type { AttractorDef } from './attractors';
import type * as THREE_TYPES from 'three';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Scene = THREE_TYPES.Scene;
type PerspectiveCamera = THREE_TYPES.PerspectiveCamera;
type WebGLRenderer = THREE_TYPES.WebGLRenderer;
type Line = THREE_TYPES.Line;
type Mesh = THREE_TYPES.Mesh;
type Clock = THREE_TYPES.Clock;
type BufferGeometry = THREE_TYPES.BufferGeometry;
type BufferAttribute = THREE_TYPES.BufferAttribute;
type MeshBasicMaterial = THREE_TYPES.MeshBasicMaterial;

export interface ChaosScene {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  controls: any; // OrbitControls — dynamic import
  primaryLine: Line;
  secondaryLine: Line;
  divergeMarker: Mesh;
  clock: Clock;
  disposed: boolean;
  dispose: () => void;
}

export interface TrailUpdate {
  primary: [number, number, number][];
  secondary: [number, number, number][];
  scale: number;
  diverged: boolean;
}

/* ------------------------------------------------------------------ */
/* Colors                                                              */
/* ------------------------------------------------------------------ */

const COLORS = {
  bg: 0x08080a,
  primary: 0x8b5cf6,    // Neo Violet
  secondary: 0x06b6d4,  // Cyan
  grid: 0x1f1f2a,
  marker: 0xef4444,     // Red for divergence marker
  ambient: 0x404040,
};

/* ------------------------------------------------------------------ */
/* Lazy imports                                                        */
/* ------------------------------------------------------------------ */

let THREE: typeof import('three') | null = null;
let OrbitControlsRef: typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls | null = null;

async function loadThree() {
  if (!THREE) {
    THREE = await import('three');
    const mod = await import('three/examples/jsm/controls/OrbitControls.js');
    OrbitControlsRef = mod.OrbitControls;
  }
  return { THREE: THREE!, OrbitControls: OrbitControlsRef! };
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function createTrailGeometry(maxPoints: number) {
  const positions = new Float32Array(maxPoints * 3);
  const geometry = new (THREE!.BufferGeometry)();
  geometry.setAttribute('position', new THREE!.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  return geometry;
}

function updateTrailGeometry(
  geometry: BufferGeometry,
  points: [number, number, number][],
  scale: number,
) {
  const posAttr = geometry.getAttribute('position') as BufferAttribute;
  const arr = posAttr.array as Float32Array;
  const len = Math.min(points.length, arr.length / 3);

  for (let i = 0; i < len; i++) {
    arr[i * 3] = points[i][0] * scale;
    arr[i * 3 + 1] = points[i][2] * scale; // z -> y (up)
    arr[i * 3 + 2] = points[i][1] * scale;
  }

  posAttr.needsUpdate = true;
  geometry.setDrawRange(0, len);
  geometry.computeBoundingSphere();
}

/* ------------------------------------------------------------------ */
/* Scene creation                                                      */
/* ------------------------------------------------------------------ */

const MAX_TRAIL_POINTS = 2000;

export async function createChaosScene(
  container: HTMLDivElement,
): Promise<ChaosScene> {
  const { THREE: T, OrbitControls } = await loadThree();

  // Scene
  const scene = new T.Scene();
  scene.background = new T.Color(COLORS.bg);

  // Camera
  const w = container.clientWidth;
  const h = container.clientHeight;
  const camera = new T.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(30, 25, 40);

  // Renderer
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;

  // Lighting
  const ambient = new T.AmbientLight(COLORS.ambient, 0.5);
  scene.add(ambient);
  const point = new T.PointLight(0xffffff, 0.8, 200);
  point.position.set(20, 30, 20);
  scene.add(point);

  // Grid
  const gridHelper = new T.GridHelper(80, 40, COLORS.grid, COLORS.grid);
  gridHelper.position.y = -15;
  const gridMat = gridHelper.material as any;
  gridMat.transparent = true;
  gridMat.opacity = 0.3;
  scene.add(gridHelper);

  // Axes helper (subtle)
  const axes = new T.AxesHelper(20);
  const axesMat = axes.material as any;
  axesMat.transparent = true;
  axesMat.opacity = 0.15;
  scene.add(axes);

  // Trail geometries + materials
  const primaryGeo = createTrailGeometry(MAX_TRAIL_POINTS);
  const primaryMat = new T.LineBasicMaterial({
    color: COLORS.primary,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });
  const primaryLine = new T.Line(primaryGeo, primaryMat);
  scene.add(primaryLine);

  const secondaryGeo = createTrailGeometry(MAX_TRAIL_POINTS);
  const secondaryMat = new T.LineBasicMaterial({
    color: COLORS.secondary,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });
  const secondaryLine = new T.Line(secondaryGeo, secondaryMat);
  scene.add(secondaryLine);

  // Divergence marker (hidden by default)
  const markerGeo = new T.SphereGeometry(0.5, 16, 16);
  const markerMat = new T.MeshBasicMaterial({
    color: COLORS.marker,
    transparent: true,
    opacity: 0,
  });
  const divergeMarker = new T.Mesh(markerGeo, markerMat);
  scene.add(divergeMarker);

  // Clock
  const clock = new T.Clock();

  // Resize handler
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  const disposed = false;

  const dispose = () => {
    if (disposed) return;
    window.removeEventListener('resize', onResize);
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    primaryLine,
    secondaryLine,
    divergeMarker,
    clock,
    disposed: false,
    dispose,
  };
}

/* ------------------------------------------------------------------ */
/* Render loop                                                         */
/* ------------------------------------------------------------------ */

export function renderFrame(chaos: ChaosScene) {
  if (chaos.disposed) return;
  chaos.controls.update();
  chaos.renderer.render(chaos.scene, chaos.camera);
}

/* ------------------------------------------------------------------ */
/* Trail updates                                                       */
/* ------------------------------------------------------------------ */

export function updateTrails(chaos: ChaosScene, update: TrailUpdate) {
  updateTrailGeometry(
    chaos.primaryLine.geometry,
    update.primary,
    update.scale,
  );
  updateTrailGeometry(
    chaos.secondaryLine.geometry,
    update.secondary,
    update.scale,
  );

  // Divergence marker: show at midpoint between last points
  if (update.diverged && update.primary.length > 0 && update.secondary.length > 0) {
    const p = update.primary[update.primary.length - 1];
    const s = update.secondary[update.secondary.length - 1];
    chaos.divergeMarker.position.set(
      ((p[0] + s[0]) / 2) * update.scale,
      ((p[2] + s[2]) / 2) * update.scale,
      ((p[1] + s[1]) / 2) * update.scale,
    );
    (chaos.divergeMarker.material as MeshBasicMaterial).opacity = 0.7;
  } else {
    (chaos.divergeMarker.material as MeshBasicMaterial).opacity = 0;
  }
}
