'use client';

import { useActionState } from 'react';
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
      <label className="block text-sm font-medium text-neutral-300">
        Agent name <span className="text-neutral-500">(optional)</span>
        <input
          type="text"
          name="name"
          maxLength={100}
          placeholder="e.g. Sales Email Writer"
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </label>
      <label className="block text-sm font-medium text-neutral-300">
        What should the agent do? *
        <textarea
          name="taskDescription"
          required
          rows={6}
          maxLength={4000}
          placeholder="e.g. Write persuasive sales emails for our SaaS product. Given a prospect's profile and company, produce a short email that gets a reply."
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-500"
        />
      </label>
      <p className="text-xs text-neutral-500">
        UltraIa designs the system prompt, model, tools and evaluation rubric for this task.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {pending ? 'Designing your agent… (this can take ~15s)' : 'Design my agent'}
      </button>
    </form>
  );
}
