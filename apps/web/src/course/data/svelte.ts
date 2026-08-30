import type { Framework } from '../types';

export const svelte: Framework = {
  id: 'svelte',
  name: 'Svelte',
  category: 'frontend',
  icon: '🔥',
  color: '#ff3e00',
  tagline: 'Framework compilado que elimina el virtual DOM.',
  description:
    'Svelte compila los componentes a JavaScript eficiente en build time. Menos código, más rendimiento y reactividad integrada en el lenguaje.',
  modules: [
    {
      id: 'svelte-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Crea un proyecto y tu primer componente.',
      lessons: [
        {
          id: 'svelte-setup',
          title: 'Setup con Vite',
          level: 'basico',
          durationMin: 20,
          summary: 'Crea un proyecto Svelte con Vite.',
          topics: ['Vite', 'svelte', 'tooling'],
          content:
            `Svelte usa un compilador, no un runtime pesado. Crea el proyecto con 'npm create vite@latest -- --template svelte'.\n\nCada componente es un .svelte con <script>, marcado y <style> con alcance.`,
          examples: [
            {
              lang: 'bash',
              code: `npm create vite@latest mi-app -- --template svelte
cd mi-app
npm install
npm run dev`,
              caption: 'Crear proyecto Svelte.',
            },
          ],
        },
        {
          id: 'svelte-component',
          title: 'Componentes y reactividad',
          level: 'basico',
          durationMin: 25,
          summary: 'Variables reactivas y bindings.',
          topics: ['reactividad', 'let', 'bind'],
          content:
            `En Svelte, las variables de nivel superior son reactivas por defecto.\n\n'$:' marca lógica derivada reactiva; 'bind:' enlaza inputs.`,
          examples: [
            {
              lang: 'svelte',
              code: `<script>
  let nombre = 'Mundo';
</script>
<h1>Hola, {nombre}</h1>
<input bind:value={nombre} />`,
              caption: 'Reactividad y binding en Svelte.',
            },
          ],
        },
        {
          id: 'svelte-events',
          title: 'Eventos',
          level: 'basico',
          durationMin: 20,
          summary: 'Manejo de eventos con on:',
          topics: ['on', 'eventos', 'handlers'],
          content:
            `Los eventos usan 'on:click' o el shorthand 'onclick'.\n\nPuedes pasar directamente una expresión o una función.`,
          examples: [
            {
              lang: 'svelte',
              code: `<script>
  let n = 0;
  function sumar() { n += 1; }
</script>
<button on:click={sumar}>Valor: {n}</button>`,
              caption: 'Contador con evento.',
            },
          ],
        },
      ],
    },
    {
      id: 'svelte-intermedio',
      title: 'Estado y datos',
      level: 'intermedio',
      summary: 'Stores, props y fetch.',
      lessons: [
        {
          id: 'svelte-props',
          title: 'Props y stores',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Comunicación entre componentes.',
          topics: ['export', 'props', 'store'],
          content:
            `Exporta una variable con 'export let' para recibir props.\n\nLos stores (writable) comparten estado global entre componentes.`,
          examples: [
            {
              lang: 'svelte',
              code: `<script>
  export let titulo;
</script>
<h2>{titulo}</h2>`,
              caption: 'Componente con prop.',
            },
          ],
        },
        {
          id: 'svelte-fetch',
          title: 'Consumo de APIs',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Carga de datos con fetch.',
          topics: ['fetch', 'async', 'loading'],
          content:
            `Usa un store writable para datos y un estado de carga.\n\nSvelte permite await en el marcado con bloques {#await}.`,
          examples: [
            {
              lang: 'svelte',
              code: `<script>
  async function cargar() {
    const r = await fetch('/api/usuarios');
    return await r.json();
  }
</script>
{#await cargar()}
  <p>Cargando...</p>
{:then usuarios}
  <ul>{#each usuarios as u}<li>{u}</li>{/each}</ul>
{/await}`,
              caption: 'Bloque await en Svelte.',
            },
          ],
        },
        {
          id: 'svelte-stores',
          title: 'Stores avanzados',
          level: 'intermedio',
          durationMin: 30,
          summary: 'writable, readable y derived.',
          topics: ['writable', 'derived', 'store'],
          content:
            `writable permite set/update; derived combina stores.\n\nAccede al valor con el prefijo '$' (ej. '$miStore').`,
          examples: [
            {
              lang: 'ts',
              code: `import { writable, derived } from 'svelte/store';
export const contador = writable(0);
export const doble = derived(contador, ($c) => $c * 2);`,
              caption: 'Stores writable y derived.',
            },
          ],
        },
      ],
    },
    {
      id: 'svelte-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Transiciones, acciones y SSR.',
      lessons: [
        {
          id: 'svelte-transitions',
          title: 'Transiciones y animación',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Animaciones integradas.',
          topics: ['transition', 'animate', 'motion'],
          content:
            `Svelte trae transiciones (fade, fly) y directivas de animación.\n\nNo necesitas librerías externas para micro-interacciones.`,
          examples: [
            {
              lang: 'svelte',
              code: `<script>
  import { fade } from 'svelte/transition';
  let visible = true;
</script>
{#if visible}
  <p transition:fade>Texto animado</p>
{/if}`,
              caption: 'Transición fade.',
            },
          ],
        },
        {
          id: 'svelte-actions',
          title: 'Acciones (use:)',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Lógica reutilizable con acciones.',
          topics: ['use', 'action', 'lifecycle'],
          content:
            `Las acciones se aplican con 'use:'. Reciben el nodo y devuelven lifecycle.\n\nIdeal para integraciones con DOM o librerías externas.`,
          examples: [
            {
              lang: 'svelte',
              code: `<script>
  function clickFuera(nodo) {
    const h = (e) => { if (!nodo.contains(e.target)) console.log('fuera'); };
    document.addEventListener('click', h);
    return { destroy: () => document.removeEventListener('click', h) };
  }
</script>
<div use:clickFuera>Contenido</div>`,
              caption: 'Acción clickFuera.',
            },
          ],
        },
        {
          id: 'svelte-kit',
          title: 'SvelteKit (SSR)',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Full-stack con SvelteKit.',
          topics: ['SvelteKit', 'load', 'rutas'],
          content:
            `SvelteKit añade enrutado, SSR y endpoints.\n\nLas funciones load cargan datos en el servidor antes del render.`,
          examples: [
            {
              lang: 'ts',
              code: `export async function load({ fetch }) {
  const res = await fetch('/api/usuarios');
  return { usuarios: await res.json() };
}`,
              caption: 'load en SvelteKit.',
            },
          ],
        },
      ],
    },
  ],
};
