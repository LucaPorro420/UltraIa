import type { Framework } from '../types';

export const flask: Framework = {
  id: 'flask',
  name: 'Flask',
  category: 'backend',
  icon: '🌶️',
  color: '#000000',
  tagline: 'Microframework ligero y flexible para Python.',
  description:
    'Flask es minimalista: tú controlas la estructura. Ideal para APIs pequeñas, prototipos y servicios embebidos donde quieres libertad total.',
  modules: [
    {
      id: 'flask-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'App mínima y rutas.',
      lessons: [
        {
          id: 'flask-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Instala Flask y crea la app.',
          topics: ['pip', 'Flask', 'app'],
          content:
            `Instala Flask y crea una instancia de la app.\n\n'flask run' levanta el servidor de desarrollo.`,
          examples: [
            {
              lang: 'bash',
              code: `pip install flask
flask --app main run --debug`,
              caption: 'Instalar y correr Flask.',
            },
          ],
        },
        {
          id: 'flask-route',
          title: 'Rutas y vistas',
          level: 'basico',
          durationMin: 25,
          summary: 'Define endpoints con decoradores.',
          topics: ['route', 'jsonify', 'request'],
          content:
            `El decorador @app.route mapea URLs a funciones.\n\nUsa jsonify para devolver JSON correctamente.`,
          examples: [
            {
              lang: 'python',
              code: `from flask import Flask, jsonify
app = Flask(__name__)
@app.route('/saludo')
def saludo():
    return jsonify({'msg': 'hola mundo'})`,
              caption: 'Endpoint JSON en Flask.',
            },
          ],
        },
        {
          id: 'flask-methods',
          title: 'Métodos y parámetros',
          level: 'basico',
          durationMin: 20,
          summary: 'GET, POST y query params.',
          topics: ['methods', 'request', 'args'],
          content:
            `Declara methods=['GET','POST'] en la ruta.\n\nAccede a query params con request.args y al body con request.json.`,
          examples: [
            {
              lang: 'python',
              code: `@app.route('/buscar', methods=['GET'])
def buscar():
    q = request.args.get('q', '')
    return jsonify({'query': q})`,
              caption: 'Lectura de query params.',
            },
          ],
        },
      ],
    },
    {
      id: 'flask-intermedio',
      title: 'Formularios y datos',
      level: 'intermedio',
      summary: 'Body, validación y blueprints.',
      lessons: [
        {
          id: 'flask-json',
          title: 'Cuerpo JSON y validación',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Recibe y valida JSON.',
          topics: ['request.json', 'validate', 'error'],
          content:
            `Lee request.get_json() y valida campos manualmente.\n\nDevuelve 400 con mensaje claro si falta información.`,
          examples: [
            {
              lang: 'python',
              code: `@app.route('/usuarios', methods=['POST'])
def crear():
    data = request.get_json()
    if not data or 'nombre' not in data:
        return jsonify({'error': 'nombre requerido'}), 400
    return jsonify(data), 201`,
              caption: 'POST con validación.',
            },
          ],
        },
        {
          id: 'flask-blueprint',
          title: 'Blueprints',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Modulariza la aplicación.',
          topics: ['Blueprint', 'modular', 'register'],
          content:
            `Los Blueprints agrupan rutas por dominio.\n\nRegistra ellos en la app con app.register_blueprint.`,
          examples: [
            {
              lang: 'python',
              code: `from flask import Blueprint
api = Blueprint('api', __name__)
@api.route('/ping')
def ping():
    return jsonify({'pong': True})
# app.register_blueprint(api, url_prefix='/api')`,
              caption: 'Blueprint modular.',
            },
          ],
        },
        {
          id: 'flask-sqlalchemy',
          title: 'SQLAlchemy',
          level: 'intermedio',
          durationMin: 30,
          summary: 'ORM con Flask-SQLAlchemy.',
          topics: ['SQLAlchemy', 'Model', 'session'],
          content:
            `Flask-SQLAlchemy integra el ORM con la app.\n\nDefine modelos y usa db.session para persistir.`,
          examples: [
            {
              lang: 'python',
              code: `from flask_sqlalchemy import SQLAlchemy
db = SQLAlchemy()
class Usuario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(80))
# db.create_all(); db.session.add(Usuario(nombre='A')); db.session.commit()`,
              caption: 'Modelo con SQLAlchemy.',
            },
          ],
        },
      ],
    },
    {
      id: 'flask-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Auth, factories y despliegue.',
      lessons: [
        {
          id: 'flask-factory',
          title: 'Application Factory',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Crea la app de forma testeable.',
          topics: ['factory', 'create_app', 'config'],
          content:
            `Una función create_app permite múltiples configuraciones y tests.\n\nInicializa extensiones dentro de la factory.`,
          examples: [
            {
              lang: 'python',
              code: `def create_app(config='dev'):
    app = Flask(__name__)
    app.config.from_object(config)
    from .routes import api
    app.register_blueprint(api)
    return app`,
              caption: 'Patrón application factory.',
            },
          ],
        },
        {
          id: 'flask-auth',
          title: 'Autenticación',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Login con sesión y tokens.',
          topics: ['session', 'JWT', 'bcrypt'],
          content:
            `Usa session para login clásico o JWT para APIs.\n\nHashea contraseñas con bcrypt; nunca las guardes en texto plano.`,
          examples: [
            {
              lang: 'python',
              code: `from flask import session
@app.route('/login', methods=['POST'])
def login():
    session['user_id'] = 1
    return jsonify({'ok': True})`,
              caption: 'Login con sesión.',
            },
          ],
        },
        {
          id: 'flask-deploy',
          title: 'Despliegue con WSGI',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Producción con Gunicorn.',
          topics: ['gunicorn', 'wsgi', 'workers'],
          content:
            `En producción usa Gunicorn detrás de un proxy (nginx).\n\nEvita el servidor de desarrollo en producción.`,
          examples: [
            {
              lang: 'bash',
              code: `gunicorn -w 4 main:app`,
              caption: 'Servir con Gunicorn.',
            },
          ],
        },
      ],
    },
  ],
};
