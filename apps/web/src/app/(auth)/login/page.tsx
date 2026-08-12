import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import { getCurrentUser } from '@/lib/server/context';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-neutral-400">Log in to your UltraIa workspace.</p>
      <div className="mt-8">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-neutral-400">
        No account?{' '}
        <Link href="/register" className="text-violet-400 hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
