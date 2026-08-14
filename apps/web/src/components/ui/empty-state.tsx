import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-muted bg-panel/50 px-8 py-14 text-center">
      <div className="mb-3 text-neutral-600">{icon ?? <Inbox className="h-8 w-8" />}</div>
      <p className="font-display text-[15px] font-semibold text-neutral-200">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-neutral-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}