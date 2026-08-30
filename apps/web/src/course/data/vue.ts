import type { Framework } from '../types';

export const vue: Framework = {
  id: 'vue',
  name: 'Vue.js',
  category: 'frontend',
  icon: '💚',
  color: '#42b883',
  tagline: 'Framework progresivo y accesible para interfaces web.',
  description:
    'Vue combina reactividad sencilla con un sistema de componentes basado en SFCs (Single File Components). Ideal para quienes vienen de HTML y quieren potencia moderna.',
  modules: [
    {
      id: 'vue-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Crea un proyecto Vue y tu primer componente SFC.',
      lessons: [
        {
          id: 'vue-setup',
          title: 'Setup con Vite',
          level: 'basico',
          durationMin: 20,
          summary: 'Crea una app Vue 3 con Vite y su estructura.',
          topics: ['Vite', 'create-vue', 'SFC'],
          content:
            `Vue 3 usa Composition API y SFCs (.vue). Crea el proyecto con 'npm create vue@latest'.\n\nCada .vue tiene <template>, <script setup> y <style>. 'npm run dev' levanta el servidor.`,
          examples: [
            {
              lang: 'bash',
              code: `npm create vue@latest mi-app
cd mi-app
npm install
npm run dev`,
              caption: 'Crear proyecto Vue 3.',
            },
          ],
        },
        {
          id: 'vue-sfc',
          title: 'Componentes SFC',
          level: 'basico',
          durationMin: 25,
          summary: 'Estructura de un Single File Component.',
          topics: ['template', 'script setup', 'props'],
          content:
            `El bloque <script setup> habilita Composition API sin boilerplate.\n\nDefine props con 'defineProps' y úsalas directo en el template.`,
          examples: [
            {
              lang: 'vue',
              code: `<script setup lang="ts">
const props = defineProps<{ nombre: string }>();
</script>
<template>
  <h1>Hola, {{ props.nombre }}</h1>
</template>`,
              caption: 'SFC con props tipadas.',
            },
          ],
        },
        {
          id: 'vue-binding',
          title: 'Binding y eventos',
          level: 'basico',
          durationMin: 20,
          summary: 'Interpolación, v-model y escucha de eventos.',
          topics: ['v-model', 'v-on', 'reactividad'],
          content:
            `v-model enlaza un input con una ref reactiva. Los eventos usan '@click'.\n\nLa reactividad de Vue actualiza el DOM automáticamente.`,
          examples: [
            {
              lang: 'vue',
              code: `<script setup lang="ts">
import { ref } from 'vue';
const texto = ref('');
</script>
<template>
  <input v-model="texto" placeholder="Escribe" />
  <p>{{ texto }}</p>
</template>`,
              caption: 'Two-way binding con v-model.',
            },
          ],
        },
      ],
    },
    {
      id: 'vue-intermedio',
      title: 'Reactividad y datos',
      level: 'intermedio',
      summary: 'Gestión de estado reactivo y ciclo de vida.',
      lessons: [
        {
          id: 'vue-refs',
          title: 'Refs y computed',
          level: 'intermedio',
          durationMin: 25,
          summary: 'ref, reactive y propiedades computadas.',
          topics: ['ref', 'computed', 'watch'],
          content:
            `ref envuelve un valor reactivo; computed deriva datos sin estado.\n\nwatch observa cambios para efectos secundarios.`,
          examples: [
            {
              lang: 'ts',
              code: `import { ref, computed } from 'vue';
const precio = ref(100);
const iva = computed(() => precio.value * 0.21);`,
              caption: 'computed a partir de un ref.',
            },
          ],
        },
        {
          id: 'vue-fetch',
          title: 'Consumo de APIs',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Carga de datos con fetch y estado de carga.',
          topics: ['fetch', 'async', 'loading'],
          content:
            `Usa ref para datos, carga y error, y onMounted para disparar el fetch.\n\nMuestra estados de carga para buena UX.`,
          examples: [
            {
              lang: 'vue',
              code: `<script setup lang="ts">
import { ref, onMounted } from 'vue';
const users = ref<string[]>([]);
onMounted(async () => {
  const r = await fetch('/api/usuarios');
  users.value = await r.json();
});
</script>
<template><ul><li v-for="u in users" :key="u">{{ u }}</li></ul></template>`,
              caption: 'Fetch en onMounted.',
            },
          ],
        },
        {
          id: 'vue-router',
          title: 'Vue Router',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Enrutado declarativo entre vistas.',
          topics: ['router', 'rutas', 'params'],
          content:
            `Define rutas como un array de { path, component }.\n\nAccede a parámetros con useRoute y navega con router.push.`,
          examples: [
            {
              lang: 'ts',
              code: `import { createRouter, createWebHistory } from 'vue-router';
import Home from './Home.vue';
export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: Home }],
});`,
              caption: 'Router básico de Vue.',
            },
          ],
        },
      ],
    },
    {
      id: 'vue-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Composables, stores y optimización.',
      lessons: [
        {
          id: 'vue-composable',
          title: 'Composables',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Lógica reutilizable con funciones composables.',
          topics: ['composable', 'reutilizacion', 'logica'],
          content:
            `Un composable es una función que usa la Composition API y encapsula estado/efectos.\n\nConvención: prefijo 'use'.`,
          examples: [
            {
              lang: 'ts',
              code: `import { ref, onMounted, onUnmounted } from 'vue';
export function useTimer() {
  const segundos = ref(0);
  let id: number;
  onMounted(() => { id = setInterval(() => segundos.value++, 1000); });
  onUnmounted(() => clearInterval(id));
  return { segundos };
}`,
              caption: 'Composable useTimer.',
            },
          ],
        },
        {
          id: 'vue-pinia',
          title: 'Pinia (estado global)',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Store global con Pinia.',
          topics: ['pinia', 'store', 'estado'],
          content:
            `Pinia es el store oficial de Vue. Define un store con defineStore.\n\nAccede al estado y acciones desde componentes.`,
          examples: [
            {
              lang: 'ts',
              code: `import { defineStore } from 'pinia';
export const useContador = defineStore('contador', {
  state: () => ({ n: 0 }),
  actions: { incrementar() { this.n++; } },
});`,
              caption: 'Store de Pinia.',
            },
          ],
        },
        {
          id: 'vue-perf',
          title: 'Rendimiento',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Memoización y listas virtuales.',
          topics: ['v-memo', 'lazy', 'chunking'],
          content:
            `Usa v-memo para evitar re-render de listas grandes.\n\nDivide el bundle con import dinámico para carga perezosa.`,
          examples: [
            {
              lang: 'vue',
              code: `<template>
  <div v-for="item in items" :key="item.id" v-memo="[item.id]">
    {{ item.nombre }}
  </div>
</template>`,
              caption: 'Optimización con v-memo.',
            },
          ],
        },
      ],
    },
  ],
};
