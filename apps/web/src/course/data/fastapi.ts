import type { Framework } from '../types';

export const fastapi: Framework = {
  id: 'fastapi',
  name: 'FastAPI',
  category: 'backend',
  icon: '⚡',
  color: '#009688',
  tagline: 'APIs modernas y rápidas en Python con tipos.',
  description:
    'FastAPI es un framework ASGI de alto rendimiento con validación automática vía Pydantic y tipos de Python. Ideal para microservicios y ML.',
  modules: [
    {
      id: 'fastapi-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Instala FastAPI y crea tu primer endpoint.',
      lessons: [
        {
          id: 'fastapi-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Entorno virtual y dependencias.',
          topics: ['venv', 'pip', 'uvicorn'],
          content:
            `Crea un entorno virtual y usa 'uvicorn' como servidor ASGI.\n\nInstala 'fastapi[standard]' para todo lo necesario.`,
          examples: [
            {
              lang: 'bash',
              code: `python -m venv .venv
source .venv/bin/activate
pip install "fastapi[standard]"
uvicorn main:app --reload`,
              caption: 'Instalar y levantar FastAPI.',
            },
          ],
        },
        {
          id: 'fastapi-endpoint',
          title: 'Primer endpoint',
          level: 'basico',
          durationMin: 25,
          summary: 'Define rutas GET con tipos.',
          topics: ['get', 'decorator', 'response'],
          content:
            `Los endpoints son funciones decoradas con @app.get.\n\nEl tipo de retorno genera la documentación OpenAPI automática.`,
          examples: [
            {
              lang: 'python',
              code: `from fastapi import FastAPI
app = FastAPI()
@app.get('/saludo')
def saludo() -> dict:
    return {'msg': 'hola mundo'}`,
              caption: 'Endpoint GET en FastAPI.',
            },
          ],
        },
        {
          id: 'fastapi-path',
          title: 'Parámetros de ruta',
          level: 'basico',
          durationMin: 20,
          summary: 'Variables en la URL tipadas.',
          topics: ['path param', 'int', 'validacion'],
          content:
            `Los parámetros de ruta se declaran en la función y se tipan.\n\nFastAPI valida el tipo y devuelve error 422 si no coincide.`,
          examples: [
            {
              lang: 'python',
              code: `@app.get('/items/{item_id}')
def leer(item_id: int) -> dict:
    return {'item_id': item_id}`,
              caption: 'Parámetro de ruta tipado.',
            },
          ],
        },
      ],
    },
    {
      id: 'fastapi-intermedio',
      title: 'Cuerpo y validación',
      level: 'intermedio',
      summary: 'Modelos Pydantic y respuestas.',
      lessons: [
        {
          id: 'fastapi-pydantic',
          title: 'Modelos con Pydantic',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Valida el body de la petición.',
          topics: ['BaseModel', 'body', 'validacion'],
          content:
            `Pydantic define esquemas de datos con tipos de Python.\n\nFastAPI valida el JSON entrante y genera errores claros.`,
          examples: [
            {
              lang: 'python',
              code: `from pydantic import BaseModel
class Usuario(BaseModel):
    nombre: str
    edad: int
@app.post('/usuarios')
def crear(u: Usuario) -> Usuario:
    return u`,
              caption: 'Body validado con Pydantic.',
            },
          ],
        },
        {
          id: 'fastapi-query',
          title: 'Query params y dependencias',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Parámetros de consulta y DI.',
          topics: ['query', 'Depends', 'inyeccion'],
          content:
            `Los query params se tipan como argumentos simples.\n\nDepends inyecta lógica reutilizable (auth, db).`,
          examples: [
            {
              lang: 'python',
              code: `from fastapi import Depends
def paginar(skip: int = 0, limit: int = 10) -> dict:
    return {'skip': skip, 'limit': limit}
@app.get('/lista')
def lista(p: dict = Depends(paginar)):
    return p`,
              caption: 'Dependencias de paginación.',
            },
          ],
        },
        {
          id: 'fastapi-async',
          title: 'Async y base de datos',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Funciones async y SQLAlchemy.',
          topics: ['async', 'sqlalchemy', 'session'],
          content:
            `Usa 'async def' para operaciones de I/O sin bloquear.\n\nSQLAlchemy async gestiona sesiones con 'async with'.`,
          examples: [
            {
              lang: 'python',
              code: `@app.get('/productos')
async def productos(db = Depends(get_db)) -> list:
    res = await db.execute(select(Producto))
    return res.scalars().all()`,
              caption: 'Lectura async con SQLAlchemy.',
            },
          ],
        },
      ],
    },
    {
      id: 'fastapi-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Auth, middlewares y despliegue.',
      lessons: [
        {
          id: 'fastapi-auth',
          title: 'Seguridad y JWT',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Protege rutas con tokens.',
          topics: ['OAuth2', 'JWT', 'password'],
          content:
            `Usa OAuth2PasswordBearer para extraer el token.\n\nVerifica y protege rutas con Depends. Hashea contraseñas con passlib.`,
          examples: [
            {
              lang: 'python',
              code: `from fastapi.security import OAuth2PasswordBearer
oauth2 = OAuth2PasswordBearer(tokenUrl='login')
@app.get('/me')
def me(token: str = Depends(oauth2)) -> dict:
    return {'token': token[:6]}`,
              caption: 'Protección con bearer token.',
            },
          ],
        },
        {
          id: 'fastapi-middleware',
          title: 'Middlewares y CORS',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Cross-origin y logging.',
          topics: ['CORS', 'middleware', 'origins'],
          content:
            `CORSMiddleware habilita peticiones desde el navegador.\n\nLos middlewares procesan cada request/response.`,
          examples: [
            {
              lang: 'python',
              code: `from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
)`,
              caption: 'Habilitar CORS.',
            },
          ],
        },
        {
          id: 'fastapi-deploy',
          title: 'Despliegue y rendimiento',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Producción con workers.',
          topics: ['uvicorn', 'workers', 'gunicorn'],
          content:
            `En producción usa múltiples workers con gunicorn + uvicorn.\n\nDefine un límite de tiempo y monitorea la memoria.`,
          examples: [
            {
              lang: 'bash',
              code: `gunicorn main:app -k uvicorn.workers.UvicornWorker -w 4`,
              caption: 'Worker gunicorn + uvicorn.',
            },
          ],
        },
      ],
    },
  ],
};
