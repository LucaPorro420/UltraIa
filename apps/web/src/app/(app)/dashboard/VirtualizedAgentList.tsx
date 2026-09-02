'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface AgentBlueprint {
  id: string;
  name: string;
  taskDescription: string;
  versions: Array<{
    versionNumber: number;
    status: string;
    evalRuns: Array<{ avgScore: number; status: string }>;
  }>;
}

interface VirtualizedAgentListProps {
  blueprints: AgentBlueprint[];
}

export function VirtualizedAgentList({ blueprints }: VirtualizedAgentListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: blueprints.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: 5,
  });

  // Handle window resize to recalculate
  useEffect(() => {
    const handleResize = () => virtualizer.measure();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [virtualizer]);

  if (blueprints.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] w-full overflow-auto"
      style={{ contain: 'layout' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={blueprints[virtualRow.index].id}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <AgentListItem
              blueprint={blueprints[virtualRow.index]}
              index={virtualRow.index}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentListItem({ blueprint, index }: { blueprint: AgentBlueprint; index: number }) {
  const active = blueprint.versions[0];
  const score = active?.evalRuns[0]?.avgScore;

  return (
    <div style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}>
      <Link
        href={`/agents/${blueprint.id}`}
        className="block h-full rounded-lg border border-border-subtle bg-panel p-5 transition-colors duration-150 [animation:var(--animate-chat-enter)] hover:border-border-muted hover:bg-panel-hover"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-neutral-100">{blueprint.name}</h2>
          <span className="flex shrink-0 items-center gap-1.5">
            <Badge className="bg-panel-header font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              v{active?.versionNumber ?? '?'}
            </Badge>
            {typeof score === 'number' && (
              <Badge
                className={`font-mono text-[10px] uppercase tracking-widest ${
                  score >= 0.6 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
                }`}
              >
                eval {score.toFixed(2)}
              </Badge>
            )}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] text-neutral-400">{blueprint.taskDescription}</p>
      </Link>
    </div>
  );
}