import { CreateAgentForm } from './create-agent-form';

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Design a new agent</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Describe the job in plain language. UltraIa generates the blueprint: system prompt, model,
        tools and evaluation rubric.
      </p>
      <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
        <CreateAgentForm />
      </div>
    </div>
  );
}
