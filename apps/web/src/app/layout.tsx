import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UltraIa — AI that creates AI and learns from AI',
  description:
    'Describe a task, UltraIa builds a purpose-built AI agent and improves it from real usage feedback, with human approval at every step.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
