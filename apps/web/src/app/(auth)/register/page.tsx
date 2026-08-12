import Link from 'next/link';
import { redirect } from 'next/navigation';
import { RegisterForm } from './register-form';
import { getCurrentUser } from '@/lib/server/context';

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Create your workspace</h1>
      <p className="mt-1 text-sm text-neutral-400">Start building agents that learn from use.</p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-6 text-center text-sm text-neutral-400">
        Already registered?{' '}
        <Link href="/login" className="text-violet-400 hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
