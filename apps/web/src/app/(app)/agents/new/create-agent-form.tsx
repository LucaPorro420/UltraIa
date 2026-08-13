'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createAgentAction } from '../actions';

export function CreateAgentForm() {
  const [state, formAction, pending] = useActionState(createAgentAction, null);
  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <Label className="block text-neutral-300">
        Agent name <span className="text-neutral-500">(optional)</span>
        <Input type="text" name="name" maxLength={100} placeholder="e.g. Sales Email Writer" className="mt-1" />
      </Label>
      <Label className="block text-neutral-300">
        What should the agent do? *
        <Textarea
          name="taskDescription"
          required
          rows={6}
          maxLength={4000}
          placeholder="e.g. Write persuasive sales emails for our SaaS product. Given a prospect's profile and company, produce a short email that gets a reply."
          className="mt-1"
        />
      </Label>
      <fieldset className="space-y-2">
        <legend className="text-sm text-neutral-300">Allowed capabilities</legend>
        <p className="text-xs text-neutral-500">
          Choose which tools the agent can use. Unchecking a box disables that capability for this agent.
        </p>
        <div className="flex flex-wrap gap-2">
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
              className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-sm text-neutral-300"
            >
              <input type="checkbox" name="tools" value={c.value} defaultChecked className="accent-violet-500" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-neutral-500">
        UltraIa designs the system prompt, model, tools and evaluation rubric for this task.
      </p>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Designing your agent… (this can take ~15s)' : 'Design my agent'}
      </Button>
    </form>
  );
}
