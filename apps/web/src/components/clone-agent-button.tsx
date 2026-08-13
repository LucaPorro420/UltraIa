'use client';

import { useActionState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cloneAgentAction } from '@/app/(app)/agents/actions';

export function CloneAgentButton({ agentId }: { agentId: string }) {
  const [, formAction, pending] = useActionState(cloneAgentAction, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="agentId" value={agentId} />
      <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs" disabled={pending}>
        {pending ? 'Duplicating…' : (<><Copy className="h-3.5 w-3.5" /> Duplicate</>)}
      </Button>
    </form>
  );
}
