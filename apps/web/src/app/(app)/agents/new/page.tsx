import { CreateAgentForm } from './create-agent-form';

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">new agent</p>
      <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight">Design a new agent</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Describe the job in plain language. UltraIa generates the blueprint: system prompt, model,
        tools and evaluation rubric.
      </p>
      <div className="glass-panel mt-8 rounded-xl p-5">
        <CreateAgentForm />
      </div>
    </div>
  );
}
