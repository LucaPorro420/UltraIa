import type { Framework } from '../types';

export const angular: Framework = {
  id: 'angular',
  name: 'Angular',
  category: 'frontend',
  icon: '🅰️',
  color: '#dd0031',
  tagline: 'Framework completo y opinado para aplicaciones empresariales.',
  description:
    'Angular es un framework full-featured con TypeScript, inyección de dependencias y RxJS. Ideal para aplicaciones grandes y equipos estructurados.',
  modules: [
    {
      id: 'angular-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Crea un proyecto y tu primer componente.',
      lessons: [
        {
          id: 'angular-setup',
          title: 'Setup con Angular CLI',
          level: 'basico',
          durationMin: 20,
          summary: 'Genera un proyecto Angular con la CLI.',
          topics: ['CLI', 'ng new', 'estructura'],
          content:
            `Angular CLI automatiza creación, build y testing. Crea el proyecto con 'ng new'.\n\nCada componente tiene .ts, .html y .css. 'ng serve' levanta el dev server.`,
          examples: [
            {
              lang: 'bash',
              code: `npm install -g @angular/cli
ng new mi-app
cd mi-app
ng serve`,
              caption: 'Crear y servir un proyecto Angular.',
            },
          ],
        },
        {
          id: 'angular-component',
          title: 'Componentes',
          level: 'basico',
          durationMin: 25,
          summary: 'Estructura de un componente y su template.',
          topics: ['componente', 'selector', 'template'],
          content:
            `Un componente es una clase decorada con @Component y un template HTML.\n\nEl selector define la etiqueta personalizada en el DOM.`,
          examples: [
            {
              lang: 'ts',
              code: `import { Component } from '@angular/core';
@Component({
  selector: 'app-saludo',
  template: '<h1>Hola, {{ nombre }}</h1>',
})
export class SaludoComponent {
  nombre = 'Mundo';
}`,
              caption: 'Componente Angular básico.',
            },
          ],
        },
        {
          id: 'angular-binding',
          title: 'Binding y eventos',
          level: 'basico',
          durationMin: 20,
          summary: 'Interpolación, property y event binding.',
          topics: ['interpolacion', 'event binding', 'ngModel'],
          content:
            `{{ }} interpola; [prop] enlaza propiedades; (evento) escucha.\n\n[(ngModel)] es two-way binding (requiere FormsModule).`,
          examples: [
            {
              lang: 'html',
              code: `<input [(ngModel)]="texto" placeholder="Escribe" />
<p>{{ texto }}</p>`,
              caption: 'Two-way binding con ngModel.',
            },
          ],
        },
      ],
    },
    {
      id: 'angular-intermedio',
      title: 'Servicios y datos',
      level: 'intermedio',
      summary: 'Inyección de dependencias y HTTP.',
      lessons: [
        {
          id: 'angular-di',
          title: 'Servicios e inyección',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Lógica compartida con servicios inyectables.',
          topics: ['service', 'injectable', 'DI'],
          content:
            `Los servicios se marcan con @Injectable y se inyectan en el constructor.\n\nAngular resuelve el grafo de dependencias automáticamente.`,
          examples: [
            {
              lang: 'ts',
              code: `import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class SaludoService {
  saludar(nombre: string) { return 'Hola ' + nombre; }
}`,
              caption: 'Servicio inyectable.',
            },
          ],
        },
        {
          id: 'angular-http',
          title: 'HttpClient',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Peticiones HTTP con observables.',
          topics: ['HttpClient', 'RxJS', 'observable'],
          content:
            `HttpClient devuelve Observables de RxJS. Suscríbete para obtener la respuesta.\n\nRecuerda dar de baja la suscripción para evitar fugas.`,
          examples: [
            {
              lang: 'ts',
              code: `import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
@Component({ selector: 'app-u', template: '' })
export class UComponent {
  http = inject(HttpClient);
  ngOnInit() {
    this.http.get<string[]>('/api/usuarios').subscribe((u) => console.log(u));
  }
}`,
              caption: 'GET con HttpClient.',
            },
          ],
        },
        {
          id: 'angular-routing',
          title: 'Enrutado',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Rutas y navegación.',
          topics: ['router', 'routes', 'routerLink'],
          content:
            `Define rutas en app.routes.ts con { path, component }.\n\nNavega con routerLink en plantillas o router.navigate en código.`,
          examples: [
            {
              lang: 'ts',
              code: `import { Routes } from '@angular/router';
import { HomeComponent } from './home.component';
export const routes: Routes = [{ path: '', component: HomeComponent }];`,
              caption: 'Definición de rutas.',
            },
          ],
        },
      ],
    },
    {
      id: 'angular-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'RxJS, signals y optimización.',
      lessons: [
        {
          id: 'angular-signals',
          title: 'Signals',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Reactividad fina con signals.',
          topics: ['signal', 'computed', 'reactividad'],
          content:
            `Signals (Angular 17+) dan reactividad granular y rendimiento superior.\n\ncomputed deriva; effect reacciona a cambios.`,
          examples: [
            {
              lang: 'ts',
              code: `import { Component, signal, computed } from '@angular/core';
@Component({ selector: 'app-c', template: '{{ doble() }}' })
export class CComponent {
  n = signal(2);
  doble = computed(() => this.n() * 2);
}`,
              caption: 'Signals y computed.',
            },
          ],
        },
        {
          id: 'angular-lazy',
          title: 'Lazy loading',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Carga perezosa de módulos y rutas.',
          topics: ['lazy', 'loadChildren', 'chunk'],
          content:
            `Carga rutas con loadComponent para dividir el bundle.\n\nMejora el Time to Interactive en apps grandes.`,
          examples: [
            {
              lang: 'ts',
              code: `export const routes = [
  { path: 'admin', loadComponent: () => import('./admin').then((m) => m.AdminComponent) },
];`,
              caption: 'Lazy load de componente.',
            },
          ],
        },
        {
          id: 'angular-testing',
          title: 'Testing',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Pruebas con Karma/Jest y TestBed.',
          topics: ['spec', 'TestBed', 'jasmine'],
          content:
            `Angular genera .spec.ts con TestBed para montar componentes.\n\nPrueba el DOM renderizado y la lógica del componente.`,
          examples: [
            {
              lang: 'ts',
              code: `import { TestBed } from '@angular/core/testing';
import { SaludoComponent } from './saludo.component';
it('crea', () => {
  TestBed.configureTestingModule({ imports: [SaludoComponent] });
  const f = TestBed.createComponent(SaludoComponent);
  expect(f.componentInstance).toBeTruthy();
});`,
              caption: 'Test de componente.',
            },
          ],
        },
      ],
    },
  ],
};
