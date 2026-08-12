'use client';

import { useActionState } from 'react';
import { registerAction } from '@/app/(auth)/actions';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <label className="block text-sm font-medium text-neutral-300">
        Name <span className="text-neutral-500">(optional)</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </label>
      <label className="block text-sm font-medium text-neutral-300">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </label>
      <label className="block text-sm font-medium text-neutral-300">
        Password
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
