'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const SHAPES = ['cube', 'sphere', 'torus', 'icosa'] as const;
type ShapeKind = (typeof SHAPES)[number];

function buildGeometry(shape: ShapeKind): THREE.BufferGeometry {
  switch (shape) {
    case 'sphere':
      return new THREE.SphereGeometry(1.3, 64, 64);
    case 'torus':
      return new THREE.TorusGeometry(1.1, 0.42, 32, 96);
    case 'icosa':
      return new THREE.IcosahedronGeometry(1.4, 0);
    case 'cube':
    default:
      return new THREE.BoxGeometry(1.8, 1.8, 1.8);
  }
}

export function PlaygroundCanvas({ initialShape = 'cube' }: { initialShape?: ShapeKind }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shape, setShape] = useState<ShapeKind>(initialShape);
  const rotation = useRef({ x: 0.2, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(5, 5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8b5cf6, 1.4);
    rim.position.set(-5, -2, -4);
    scene.add(rim);
    scene.add(new THREE.AmbientLight(0x404060, 1.2));

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      roughness: 0.25,
      metalness: 0.35,
      emissive: 0x1a1030,
      emissiveIntensity: 0.4,
    });
    const geometry = buildGeometry(shape);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      const w = canvas.clientWidth || 480;
      const h = canvas.clientHeight || 360;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    const animate = () => {
      if (!dragging.current && !reduced) {
        rotation.current.y += 0.006;
        rotation.current.x += 0.0022;
      }
      mesh.rotation.x = rotation.current.x;
      mesh.rotation.y = rotation.current.y;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      rotation.current.y += dx * 0.01;
      rotation.current.x += dy * 0.01;
    };
    const onUp = () => {
      dragging.current = false;
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [shape]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SHAPES.map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors duration-200 ${
              shape === s
                ? 'bg-primary text-white shadow-[0_0_18px_-8px_var(--color-primary)]'
                : 'border border-border-subtle bg-panel text-neutral-300 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="h-[360px] w-full rounded-2xl border border-border-subtle bg-input-active"
        style={{ touchAction: 'none' }}
      />
      <p className="text-xs text-neutral-500">
        Arrastra para rotar · auto-rotación en reposo (se respeta{' '}
        <code className="font-mono text-neutral-400">prefers-reduced-motion</code>).
      </p>
    </div>
  );
}
