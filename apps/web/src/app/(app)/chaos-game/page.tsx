import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chaos Game — 3D Butterfly Effect Explorer',
  description:
    'Explore chaos theory interactively. Visualize Lorenz, Rössler, Thomas, and Halvorsen attractors in 3D with dual trajectory comparison.',
};

export default function ChaosGamePage() {
  return (
    <main style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <ChaosGameLoader />
    </main>
  );
}

/** Lazy-load the client component to avoid SSR issues with Three.js */
async function ChaosGameLoader() {
  const { default: ChaosGame } = await import('./chaos-game-client');
  return <ChaosGame />;
}
