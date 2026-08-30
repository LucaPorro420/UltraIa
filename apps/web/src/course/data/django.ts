import type { Framework } from '../types';

export const django: Framework = {
  id: 'django',
  name: 'Django',
  category: 'backend',
  icon: '🐍',
  color: '#0c4b33',
  tagline: 'Framework baterías-incluidas para Python.',
  description:
    'Django es un framework full-stack con ORM, admin automático y seguridad integrada. Perfecto para aplicaciones robustas y rápidas de construir.',
  modules: [
    {
      id: 'django-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Proyecto, app y primer vista.',
      lessons: [
        {
          id: 'django-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Crea proyecto y una app.',
          topics: ['django-admin', 'startapp', 'runserver'],
          content:
            `Django separa proyecto (config) y apps (módulos). Crea con 'django-admin startproject'.\n\n'makemigrations' y 'migrate' sincronizan el ORM con la base.`,
          examples: [
            {
              lang: 'bash',
              code: `django-admin startproject tienda .
python manage.py startapp productos
python manage.py runserver`,
              caption: 'Crear proyecto y app Django.',
            },
          ],
        },
        {
          id: 'django-view',
          title: 'Vistas y URLs',
          level: 'basico',
          durationMin: 25,
          summary: 'Mapea URLs a funciones vista.',
          topics: ['view', 'url', 'HttpResponse'],
          content:
            `Las vistas reciben request y devuelven HttpResponse.\n\nEl módulo urls.py enruta patrones a vistas.`,
          examples: [
            {
              lang: 'python',
              code: `from django.http import JsonResponse
from django.urls import path
def saludo(request):
    return JsonResponse({'msg': 'hola'})
urlpatterns = [path('saludo/', saludo)]`,
              caption: 'Vista y ruta simple.',
            },
          ],
        },
        {
          id: 'django-template',
          title: 'Templates',
          level: 'basico',
          durationMin: 20,
          summary: 'Renderiza HTML con contexto.',
          topics: ['render', 'template', 'context'],
          content:
            `Usa render con un diccionario de contexto.\n\nLos templates usan {{ variable }} y {% tag %}.`,
          examples: [
            {
              lang: 'python',
              code: `from django.shortcuts import render
def home(request):
    return render(request, 'home.html', {'nombre': 'Mundo'})`,
              caption: 'Render con contexto.',
            },
          ],
        },
      ],
    },
    {
      id: 'django-intermedio',
      title: 'Modelos y datos',
      level: 'intermedio',
      summary: 'ORM, migraciones y forms.',
      lessons: [
        {
          id: 'django-model',
          title: 'Modelos y ORM',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Define entidades con el ORM.',
          topics: ['Model', 'Field', 'migrate'],
          content:
            `Los modelos son clases que heredan de models.Model.\n\nCada campo mapea a una columna; los métodos del ORM evitan SQL crudo.`,
          examples: [
            {
              lang: 'python',
              code: `from django.db import models
class Producto(models.Model):
    nombre = models.CharField(max_length=100)
    precio = models.DecimalField(max_digits=8, decimal_places=2)
    def __str__(self):
        return self.nombre`,
              caption: 'Modelo Producto.',
            },
          ],
        },
        {
          id: 'django-queryset',
          title: 'QuerySets',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Consultas con el ORM.',
          topics: ['filter', 'get', 'orm'],
          content:
            `El ORM traduce filter/get a SQL seguro (sin inyección).\n\nEncadena filtros y ordena con order_by.`,
          examples: [
            {
              lang: 'python',
              code: `baratos = Producto.objects.filter(precio__lt=50).order_by('nombre')
primero = Producto.objects.get(id=1)`,
              caption: 'Consultas con el ORM.',
            },
          ],
        },
        {
          id: 'django-forms',
          title: 'Forms y validación',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Formularios con validación.',
          topics: ['Form', 'is_valid', 'clean'],
          content:
            `Django Forms validan y limpian datos automáticamente.\n\nis_valid distingue entrada correcta de errores.`,
          examples: [
            {
              lang: 'python',
              code: `from django import forms
class ContactoForm(forms.Form):
    email = forms.EmailField()
    mensaje = forms.CharField(widget=forms.Textarea)
# en la vista: if form.is_valid(): ...`,
              caption: 'Formulario con validación.',
            },
          ],
        },
      ],
    },
    {
      id: 'django-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Admin, API REST y seguridad.',
      lessons: [
        {
          id: 'django-admin',
          title: 'Admin automático',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Panel CRUD sin escribir UI.',
          topics: ['admin', 'register', 'staff'],
          content:
            `Registra modelos en admin.py para CRUD instantáneo.\n\nPersonaliza listas, filtros y búsqueda.`,
          examples: [
            {
              lang: 'python',
              code: `from django.contrib import admin
from .models import Producto
@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio')
    search_fields = ('nombre',)`,
              caption: 'Registro en el admin.',
            },
          ],
        },
        {
          id: 'django-drf',
          title: 'Django REST Framework',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Exponer el ORM como API.',
          topics: ['DRF', 'serializer', 'ViewSet'],
          content:
            `DRF serializa modelos y expone ViewSets con router.\n\nObtienes CRUD + paginación + auth con poco código.`,
          examples: [
            {
              lang: 'python',
              code: `from rest_framework import serializers, viewsets
from .models import Producto
class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Producto
        fields = '__all__'
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer`,
              caption: 'API con DRF.',
            },
          ],
        },
        {
          id: 'django-security',
          title: 'Seguridad',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Protecciones integradas.',
          topics: ['CSRF', 'XSS', 'settings'],
          content:
            `Django incluye CSRF, escapado de templates y hashing de contraseñas.\n\nNunca desactivés DEBUG en producción sin configurar ALLOWED_HOSTS.`,
          examples: [
            {
              lang: 'python',
              code: `# settings.py
DEBUG = False
ALLOWED_HOSTS = ['mi-dominio.com']
# las contraseñas se hashean con make_password`,
              caption: 'Hardening básico.',
            },
          ],
        },
      ],
    },
  ],
};
