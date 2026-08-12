import Link from 'next/link';
import { optionalUser } from '@/lib/server/context';

export default async function LandingPage() {
  const user = await optionalUser();
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <header className="flex items-center justify-between">
        <div className="text-lg font-bold tracking-tight">
          Ultra<span className="text-violet-400">Ia</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
            >
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-neutral-300 hover:text-white">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mt-28 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight tracking-tight">
          AI that <span className="text-violet-400">creates AI</span> — and learns from every
          conversation.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
          Describe a task in plain language. UltraIa designs a purpose-built AI agent with its own
          system prompt, tools and evaluation rubric. Real feedback drives automatic improvements —
          always gated by evaluation, always approved by you.
        </p>
        <div className="mt-10">
          {user ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-violet-600 px-8 py-3 font-semibold text-white hover:bg-violet-500"
            >
              Create your first agent
            </Link>
          ) : (
            <Link
              href="/register"
              className="rounded-xl bg-violet-600 px-8 py-3 font-semibold text-white hover:bg-violet-500"
            >
              Create your first agent
            </Link>
          )}
        </div>
      </section>

      <section className="mt-28 grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'Generate',
            body: 'Tell us the job. Our Agent Architect produces a precise system prompt, model choice, tools and a measurable rubric.',
          },
          {
            title: 'Run',
            body: 'Chat with your agent or call it over a scoped API key. Every exchange is stored and available for evaluation.',
          },
          {
            title: 'Improve',
            body: 'Negative feedback and failed evaluations feed an improvement pipeline. New versions must pass regression evals before they go live.',
          },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h2 className="text-lg font-semibold text-violet-300">{f.title}</h2>
            <p className="mt-2 text-sm text-neutral-400">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mt-28 border-t border-neutral-800 pt-8 text-center text-xs text-neutral-600">
        UltraIa · AI creates AI, humans approve.
      </footer>
    </main>
  );
}
