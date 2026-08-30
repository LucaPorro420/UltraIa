import type { Framework } from '../types';

export const react: Framework = {
  id: 'react',
  name: 'React',
  category: 'frontend',
  icon: '⚛️',
  color: '#61dafb',
  tagline: 'Biblioteca para interfaces de usuario basadas en componentes.',
  description:
    'React es la biblioteca de UI más usada del ecosistema JavaScript. Aprende desde el renderizado con JSX hasta hooks personalizados y optimización de rendimiento.',
  modules: [
    {
      id: 'react-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Configura el proyecto, entiende JSX y crea tu primer componente.',
      lessons: [
        {
          id: 'react-setup',
          title: 'Setup con Vite',
          level: 'basico',
          durationMin: 20,
          summary: 'Crea una app React moderna con Vite y su estructura.',
          topics: ['Vite', 'npm create', 'dev server'],
          content:
            `Vite es el bundler estándar para React en 2026: arranque instantáneo y HMR.\n\nCrea el proyecto con 'npm create vite@latest mi-app -- --template react', instala y ejecuta 'npm run dev'. El punto de entrada es main.tsx, que monta <App /> en el DOM.`,
          examples: [
            {
              lang: 'bash',
              code: `npm create vite@latest mi-app -- --template react
cd mi-app
npm install
npm run dev`,
              caption: 'Crear y levantar un proyecto React con Vite.',
            },
          ],
        },
        {
          id: 'react-jsx',
          title: 'JSX y componentes',
          level: 'basico',
          durationMin: 25,
          summary: 'JSX es HTML en JavaScript; los componentes devuelven UI.',
          topics: ['JSX', 'componente', 'props'],
          content:
            `JSX se transpila a llamadas createElement. Un componente es una función que devuelve JSX.\n\nLas props son la entrada del componente; pásalas como atributos y recíbelas como argumento.`,
          examples: [
            {
              lang: 'tsx',
              code: `type SaludoProps = { nombre: string };
function Saludo({ nombre }: SaludoProps) {
  return <h1>Hola, {nombre}</h1>;
}
export default function App() {
  return <Saludo nombre="Mundo" />;
}`,
              caption: 'Componente funcional con props tipadas.',
            },
          ],
        },
        {
          id: 'react-render-list',
          title: 'Listas y keys',
          level: 'basico',
          durationMin: 20,
          summary: 'Renderiza colecciones con map y una key estable.',
          topics: ['map', 'key', 'listas'],
          content:
            `Usa 'array.map' para renderizar listas. La prop 'key' debe ser estable y única (no el índice si la lista cambia).\n\nSin key React no puede reconciliar eficientemente los elementos.`,
          examples: [
            {
              lang: 'tsx',
              code: `const items = [{ id: 1, nombre: 'A' }, { id: 2, nombre: 'B' }];
function Lista() {
  return (
    <ul>
      {items.map((i) => <li key={i.id}>{i.nombre}</li>)}
    </ul>
  );
}`,
              caption: 'Render de lista con key por id.',
            },
          ],
        },
      ],
    },
    {
      id: 'react-intermedio',
      title: 'Estado y datos',
      level: 'intermedio',
      summary: 'Maneja estado local, efectos y eventos del usuario.',
      lessons: [
        {
          id: 'react-usestate',
          title: 'useState y eventos',
          level: 'intermedio',
          durationMin: 25,
          summary: 'El estado local con useState y handlers de eventos.',
          topics: ['useState', 'eventos', 'onChange'],
          content:
            `useState devuelve [valor, setter]. Actualiza el estado y React re-renderiza.\n\nLos eventos usan props como 'onClick' y 'onChange' con funciones manejadoras.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { useState } from 'react';
function Contador() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>Valor: {n}</button>;
}`,
              caption: 'Contador con estado local.',
            },
          ],
        },
        {
          id: 'react-useeffect',
          title: 'useEffect y ciclo de vida',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Efectos secundarios y limpieza con useEffect.',
          topics: ['useEffect', 'dependencias', 'cleanup'],
          content:
            `useEffect ejecuta lógica tras el render. El array de dependencias controla cuándo se ejecuta.\n\nDevuelve una función de limpieza para cancelar suscripciones o timers.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { useEffect, useState } from 'react';
function Reloj() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <p>{hora.toLocaleTimeString()}</p>;
}`,
              caption: 'Efecto con limpieza de intervalo.',
            },
          ],
        },
        {
          id: 'react-fetch',
          title: 'Consumo de APIs',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Llamadas fetch con estado de carga y error.',
          topics: ['fetch', 'loading', 'error'],
          content:
            `Combina useState y useEffect para cargar datos remotos.\n\nManeja estados de carga, éxito y error para una UX robusta.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { useEffect, useState } from 'react';
function Usuarios() {
  const [data, setData] = useState<{ id: number; nombre: string }[]>([]);
  useEffect(() => {
    fetch('/api/usuarios')
      .then((r) => r.json())
      .then(setData);
  }, []);
  return <ul>{data.map((u) => <li key={u.id}>{u.nombre}</li>)}</ul>;
}`,
              caption: 'Carga de datos desde una API.',
            },
          ],
        },
      ],
    },
    {
      id: 'react-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Hooks personalizados, Context y optimización.',
      lessons: [
        {
          id: 'react-custom-hook',
          title: 'Hooks personalizados',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Extrae lógica reutilizable en hooks propios.',
          topics: ['custom hook', 'reutilizacion', 'logica'],
          content:
            `Un hook personalizado es una función que usa otros hooks. Permite compartir estado y efectos.\n\nConvención: el nombre empieza por 'use'.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { useState, useEffect } from 'react';
function useAncho() {
  const [ancho, setAncho] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setAncho(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return ancho;
}`,
              caption: 'Hook personalizado useAncho.',
            },
          ],
        },
        {
          id: 'react-context',
          title: 'Context API',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Comparte estado global sin prop drilling.',
          topics: ['Context', 'Provider', 'useContext'],
          content:
            `Context evita pasar props manualmente por muchos niveles.\n\nCrea el contexto, provee el valor con <Provider> y consúmelo con useContext.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { createContext, useContext } from 'react';
const Tema = createContext<'claro' | 'oscuro'>('claro');
function Boton() {
  const tema = useContext(Tema);
  return <button className={tema}>Acción</button>;
}
function App() {
  return <Tema.Provider value="oscuro"><Boton /></Tema.Provider>;
}`,
              caption: 'Tema global con Context.',
            },
          ],
        },
        {
          id: 'react-memo',
          title: 'Rendimiento',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Evita re-renders con memo, useMemo y useCallback.',
          topics: ['memo', 'useMemo', 'useCallback'],
          content:
            `React re-renderiza por defecto en cascada. Envuelve componentes con memo para memoizarlos.\n\nUsa useMemo para cálculos costosos y useCallback para funciones estables.`,
          examples: [
            {
              lang: 'tsx',
              code: `import { memo, useMemo } from 'react';
const Lista = memo(function Lista({ items }: { items: number[] }) {
  const total = useMemo(() => items.reduce((a, b) => a + b, 0), [items]);
  return <p>Total: {total}</p>;
});`,
              caption: 'Memoización de componente y cálculo.',
            },
          ],
        },
      ],
    },
  ],
};
