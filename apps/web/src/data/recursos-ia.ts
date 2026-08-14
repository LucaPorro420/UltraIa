export type RecursoIA = {
  nombre: string;
  canal: string;
  url: string;
  sitio?: string;
  subs?: string;
  enfoque: string;
  workflows: string[];
};

export const RECURSOS_IA: RecursoIA[] = [
  {
    nombre: 'Ben AI',
    canal: '@BenAI92',
    url: 'https://www.youtube.com/@BenAI92',
    sitio: 'https://benvansprundel.com',
    enfoque:
      'Agentes IA no-code con n8n y Make. Vende "systems in a box" (SEO, LinkedIn, BDR) que montas y despliegas en días.',
    workflows: ['SEO system', 'LinkedIn system', 'Agentes BDR con IA'],
  },
  {
    nombre: 'AI Edge',
    canal: '@AIEdgeHQ',
    url: 'https://www.youtube.com/@AIEdgeHQ',
    enfoque:
      'Noticias e insights de IA con tutoriales prácticos: cómo exprimir los últimos releases de Claude y compañía.',
    workflows: ['Seguimiento de releases', 'Tutoriales de agentes Claude'],
  },
  {
    nombre: 'The MIT Monk',
    canal: '@theMITmonk',
    url: 'https://www.youtube.com/@theMITmonk',
    enfoque:
      'Estrategia y mindset para founders: cómo la IA cambia el trabajo de un CEO (MIT MBA + formación de monje).',
    workflows: ['Estrategia de negocio con IA', 'Mindset de founder'],
  },
  {
    nombre: 'Jeff Su',
    canal: '@JeffSu',
    url: 'https://www.youtube.com/@JeffSu',
    sitio: 'https://jeffsu.org',
    subs: '1.2M+',
    enfoque:
      'Productividad con IA: Google Workspace, Notion y ChatGPT aplicados a tareas de oficina reales, con plantillas listas.',
    workflows: ['Sistema de notas y captura', 'Prompts de productividad', 'Autopilot de tareas'],
  },
  {
    nombre: 'Dan Martell',
    canal: '@danmartell',
    url: 'https://www.youtube.com/@danmartell',
    sitio: 'https://danmartell.com',
    enfoque:
      'Negocios potenciados con IA: Buy Back Your Time, sistemas de crecimiento escalables y Martell Ventures.',
    workflows: ['Buy Back Your Time', 'Sistemas de negocio con IA'],
  },
  {
    nombre: 'Varun Mayya',
    canal: '@VarunMayya',
    url: 'https://www.youtube.com/@VarunMayya',
    sitio: 'https://yaas.media',
    enfoque:
      'Content engine con IA y Aeos Group: producir contenido a escala con avatares, skills de IA y procesos replicables.',
    workflows: ['Content engine con IA', 'Avatares de marca', 'Skills de IA'],
  },
  {
    nombre: 'Liam Ottley',
    canal: '@LiamOttley',
    url: 'https://www.youtube.com/@LiamOttley',
    sitio: 'https://morningside.ai',
    subs: '833K+',
    enfoque:
      'AI Automation Agency (AAA): fundar agencias de automatización con n8n, Make y Vapi; captación y entrega de clientes.',
    workflows: ['Funnel AAA', 'Automatización n8n/Make', 'Agentes de voz (Vapi)'],
  },
];