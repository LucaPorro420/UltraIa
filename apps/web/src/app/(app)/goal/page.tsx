import { GoalClient } from './goal-client';

export const metadata = { title: 'Goal · UltraIa' };

export default function GoalPage() {
  return (
    <section className="neo-aura w-full">
      <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">meta-agent</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Ejecutor de objetivos <span className="gradient-neo-text">/goal</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-neutral-400">
        Describe un objetivo global y la lista de tareas. El meta-agente orquesta todas las capacidades de
        UltraIa (contenido, viajes, planificador, investigacion, memoria, publicacion y mensajeria) y
        devuelve el resultado de cada tarea.
      </p>
      <GoalClient />
    </section>
  );
}
