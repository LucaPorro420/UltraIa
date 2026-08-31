import type { Metadata } from 'next';
import HypothesisQuestClient from './hypothesis-quest-client';

export const metadata: Metadata = {
  title: 'Hypothesis Quest 3D — Butterfly Effect Edition | UltraIa',
  description: 'Explore unsolved mathematical problems through interactive 3D worlds with butterfly effect mechanics.',
};

export default function HypothesisQuestPage() {
  return <HypothesisQuestClient />;
}
