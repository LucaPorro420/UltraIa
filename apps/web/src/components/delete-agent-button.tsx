'use client';

import { useActionState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteAgentAction } from '@/app/(app)/agents/actions';

export function DeleteAgentButton({ agentId }: { agentId: string }) {
  const [, formAction, pending] = useActionState(deleteAgentAction, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="agentId" value={agentId} />
      <button
        type="submit"
        disabled={pending}
        onClick={(e) => {
          if (!confirm('Delete this agent? This cannot be undone.')) e.preventDefault();
        }}
        className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/50 disabled:opacity-50"
      >
        {pending ? 'Deleting…' : (<><Trash2 className="h-3.5 w-3.5" /> Delete agent</>)}
      </button>
    </form>
  );
}
