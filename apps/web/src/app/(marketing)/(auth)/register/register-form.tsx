'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerAction } from '@/app/(marketing)/(auth)/actions';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Name <span className="normal-case text-neutral-500">(optional)</span>
          <Input
            type="text"
            name="name"
            autoComplete="name"
            className="mt-1.5 bg-input-active border-border-muted transition-colors duration-150"
          />
        </Label>
        <Label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Email
          <Input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1.5 bg-input-active border-border-muted transition-colors duration-150"
          />
        </Label>
      </div>
      <Label className="block font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Password <span className="normal-case text-neutral-500">(mín. 8)</span>
        <Input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className="mt-1.5 bg-input-active border-border-muted transition-colors duration-150"
        />
      </Label>
      <Button
        type="submit"
        disabled={pending}
        className="w-full shadow-[0_0_24px_-8px_var(--color-primary)] transition-all duration-200 hover:shadow-[0_0_32px_-6px_var(--color-primary)]"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}