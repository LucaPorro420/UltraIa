'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/app/(marketing)/(auth)/actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {state.error}
        </p>
      )}
      <Label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Usuario o email
        <Input
          type="text"
          name="email"
          required
          autoComplete="username"
          placeholder="admin o tu email"
          className="mt-1.5 bg-input-active border-border-muted transition-colors duration-150"
        />
      </Label>
      <Label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Password
        <Input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1.5 bg-input-active border-border-muted transition-colors duration-150"
        />
      </Label>
      <Button
        type="submit"
        disabled={pending}
        className="w-full shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:shadow-[0_0_32px_-6px_var(--color-primary)]"
      >
        {pending ? 'Logging in…' : 'Log in'}
      </Button>
    </form>
  );
}