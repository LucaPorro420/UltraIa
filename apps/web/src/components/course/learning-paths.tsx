import type { LearningPath } from '@/course/data/learning-paths';

const LEVEL_BADGE: Record<LearningPath['level'], string> = {
  basico: 'bg-emerald-500/20 text-emerald-400',
  intermedio: 'bg-amber-500/20 text-amber-400',
  avanzado: 'bg-red-500/20 text-red-400',
};

const LEVEL_LABEL: Record<LearningPath['level'], string> = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export function LearningPaths({ paths }: { paths: LearningPath[] }) {
  if (paths.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center">
        <p className="text-neutral-400">No hay caminos de aprendizaje verificados.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {paths.map((path) => (
        <li key={path.id}>
          <a
            href={path.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block h-full"
          >
            <div className="glass-panel card-glow-hover flex h-full flex-col rounded-xl p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                  {path.provider}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase ${LEVEL_BADGE[path.level]}`}
                >
                  {LEVEL_LABEL[path.level]}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-display font-semibold tracking-tight text-white">
                {path.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-neutral-400">
                {path.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {path.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="font-mono text-xs text-neutral-500">
                  {path.duration}
                </span>
                <span className="text-sm font-semibold text-primary transition-colors group-hover:text-primary/80">
                  Ver curso →
                </span>
              </div>
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
