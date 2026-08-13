'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerAction } from '@/app/(auth)/actions';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  return (
    <Card className="p-6">
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}
        <Label className="block text-neutral-300">
          Name <span className="text-neutral-500">(optional)</span>
          <Input type="text" name="name" autoComplete="name" className="mt-1" />
        </Label>
        <Label className="block text-neutral-300">
          Email
          <Input type="email" name="email" required autoComplete="email" className="mt-1" />
        </Label>
        <Label className="block text-neutral-300">
          Password
          <Input type="password" name="password" required minLength={8} autoComplete="new-password" className="mt-1" />
        </Label>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Card>
  );
}
