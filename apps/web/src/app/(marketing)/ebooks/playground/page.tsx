import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PlaygroundCanvas } from '@/components/ebooks/playground-canvas';

export const metadata: Metadata = {
  title: 'Playground 3D · UltraIa',
  description: 'Experimenta con Three.js en tiempo real: cubo, esfera, toro e icosaedro interactivos.',
};

const SAMPLE = `import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.z = 5;

const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 1.8, 1.8),
  new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.25 })
);
scene.add(mesh);
// animate: mesh.rotation.y += 0.006`;

export default async function PlaygroundPage() {
  return (
    <main className="min-h-screen bg-canvas">
      <section className="neo-aura mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/ebooks"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors duration-200 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Catálogo
        </Link>

        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Playground <span className="gradient-neo-text">3D</span>
        </h1>
        <p className="mt-4 max-w-2xl text-neutral-400">
          Experimenta con Three.js en tiempo real. Selecciona una forma y arrástrala para rotar la
          cámara. Sin dependencias extra: usa <code className="font-mono text-neutral-300">three</code>{' '}
          directamente en un componente cliente de Next.js.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <PlaygroundCanvas initialShape="cube" />

          <aside className="rounded-2xl border border-border-subtle bg-panel p-5">
            <h2 className="font-display text-sm font-semibold text-neutral-100">Código</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-input-active p-4 text-[12px] leading-relaxed text-neutral-300">
              <code>{SAMPLE}</code>
            </pre>
            <Link
              href="/ebooks"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-neo-200 transition-colors duration-200 hover:text-neo-100"
            >
              Ver los ebooks relacionados →
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
