'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PendingLoader } from '@/components/pending-loader';
import { createAgentAction } from '../actions';

export function CreateAgentForm() {
  const [state, formAction, pending] = useActionState(createAgentAction, null);
  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="rounded-lg border border-red-800/80 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">step 01</p>
        <Label className="mt-1 block text-neutral-200">
          Agent name <span className="text-neutral-500">(optional)</span>
          <Input
            type="text"
            name="name"
            maxLength={100}
            placeholder="e.g. Sales Email Writer"
            className="mt-2 border-neutral-700 bg-input-active focus:border-violet-500"
          />
        </Label>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">step 02</p>
        <Label className="mt-1 block text-neutral-200">
          What should the agent do? *
          <Textarea
            name="taskDescription"
            required
            rows={6}
            maxLength={4000}
            placeholder="e.g. Write persuasive sales emails for our SaaS product. Given a prospect's profile and company, produce a short email that gets a reply."
            className="mt-2 border-neutral-700 bg-input-active focus:border-violet-500"
          />
        </Label>
      </div>

      <fieldset className="space-y-2">
        <legend className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
          Allowed capabilities
        </legend>
        <p className="text-xs text-neutral-500">
          Choose which tools the agent can use. Unchecking a box disables that capability for this agent.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(
            [
              { value: 'web', label: 'Web' },
              { value: 'image', label: 'Image' },
              { value: 'video', label: 'Video' },
              { value: 'music', label: 'Music' },
              { value: 'design', label: 'Design' },
            ] as const
          ).map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-sm text-neutral-300 transition-colors duration-150 hover:border-violet-500/50 hover:bg-neutral-900 has-[:checked]:border-violet-500/60 has-[:checked]:bg-violet-500/10 has-[:checked]:text-violet-200"
            >
              <input
                type="checkbox"
                name="tools"
                value={c.value}
                defaultChecked
                className="accent-violet-500 focus-visible:outline-none"
              />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-lg border border-border-subtle bg-input-active/60 px-3 py-2.5">
        <p className="text-xs text-neutral-500">
          UltraIa designs the system prompt, model, tools and evaluation rubric for this task.
        </p>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 text-white shadow-[0_8px_24px_-12px_rgba(139,92,246,0.6)] transition-all duration-150 hover:bg-violet-500 hover:shadow-[0_10px_32px_-12px_rgba(139,92,246,0.8)]"
      >
        {pending ? 'Designing your agent…' : 'Design my agent'}
      </Button>
      {pending && <PendingLoader label="Designing your agent" />}
    </form>
  );
}
