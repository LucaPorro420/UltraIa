import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { LoginForm } from './login-form';
import { getCurrentUser } from '@/lib/server/context';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <>
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden className="aurora-bg pointer-events-none absolute inset-0" />
      <div
        aria-hidden
        className="grid-dots pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,black_15%,transparent_70%)]"
      />
      <div className="relative w-full max-w-md [animation:var(--animate-chat-enter)]">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border-muted bg-panel/70 px-4 py-1.5 font-mono text-xs font-bold tracking-tight text-neutral-200 backdrop-blur-md transition-colors duration-200 hover:border-primary/50 hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Ultra<span className="text-primary">Ia</span>
          </Link>
        </div>
        <div className="gradient-neo-frame rounded-2xl p-px shadow-[0_0_48px_-16px_var(--color-neo-400)]">
          <div className="glass-panel rounded-[15px] p-8">
            <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              workspace access
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
              Welcome <span className="gradient-neo-text">back</span>
            </h1>
            <p className="mt-2 text-sm text-neutral-400">Log in to your UltraIa workspace.</p>
            <div className="mt-6">
              <LoginForm />
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-neutral-400">
          No account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary transition-colors duration-200 hover:text-violet-400"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
    </>
  );
}