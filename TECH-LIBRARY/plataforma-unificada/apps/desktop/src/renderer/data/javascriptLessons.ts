// Course content data - separated to avoid template literal parsing issues
export interface CourseLesson {
  id: string;
  title: string;
  content: string;
  order: number;
  completed?: boolean;
  hasQuiz?: boolean;
  quizScore?: number;
  quizTotal?: number;
}

export const javascriptLessons: CourseLesson[] = [
  { 
    id: '1', 
    title: 'Introducci\u00f3n a ES6+', 
    content: '# Introducci\u00f3n a ES6+\n\nJavaScript ha evolucionado mucho desde ES5. ES6 (ES2015) trajo cambios fundamentales...\n\n## Novedades principales\n- let y const\n- Funciones flecha\n- Template literals\n- Destructuring\n- M\u00f3dulos\n- Promesas\n- Clases', 
    order: 0, 
    completed: true, 
    hasQuiz: true, 
    quizScore: 10, 
    quizTotal: 10 
  },
  { 
    id: '2', 
    title: 'Variables: let y const', 
    content: '# Variables: let y const\n\n## var vs let vs const\n\n### var\n- Scope de funci\u00f3n\n- Hoisting\n- Re-declarable\n\n### let\n- Scope de bloque\n- No hoisting (TDZ)\n- Re-asignable\n\n### const\n- Scope de bloque\n- No re-asignable\n- Referencia inmutable', 
    order: 1, 
    completed: true, 
    hasQuiz: true, 
    quizScore: 8, 
    quizTotal: 10 
  },
  { 
    id: '3', 
    title: 'Funciones Flecha', 
    content: '# Funciones Flecha\n\n## Sintaxis\n```js\nconst sumar = (a, b) => a + b;\nconst saludar = nombre => `Hola ${nombre}`;\nconst multiplicar = (a, b) => {\n  return a * b;\n};\n```\n\n## Diferencias con function\n- No tienen `this` propio\n- No son constructores\n- Sintaxis m\u00e1s concisa', 
    order: 2, 
    completed: true, 
    hasQuiz: true, 
    quizScore: 10, 
    quizTotal: 10 
  },
  { 
    id: '4', 
    title: 'Template Literals', 
    content: '# Template Literals\n\n## Interpolaci\u00f3n\n```js\nconst nombre = "Juan";\nconst mensaje = `Hola ${nombre}, bienvenido!`;\n```\n\n## Multil\u00ednea\n```js\nconst html = `\n  <div>\n    <h1>${titulo}</h1>\n  </div>\n`;\n```\n\n## Tagged Templates\n```js\nfunction etiqueta(strings, ...values) {\n  return strings.reduce((acc, str, i) => acc + str + (values[i] || \'\'), \'\');\n}\n```', 
    order: 3, 
    completed: true, 
    hasQuiz: true, 
    quizScore: 9, 
    quizTotal: 10 
  },
  { 
    id: '5', 
    title: 'Destructuring', 
    content: '# Destructuring\n\n## Arrays\n```js\nconst [primero, segundo, ...resto] = [1, 2, 3, 4, 5];\n```\n\n## Objetos\n```js\nconst { nombre, edad, ...resto } = { nombre: "Juan", edad: 30, ciudad: "Madrid" };\n```\n\n## Par\u00e1metros\n```js\nfunction saludar({ nombre, edad = 25 }) {\n  return `Hola ${nombre}, tienes ${edad} a\u00f1os`;\n}\n```', 
    order: 4, 
    completed: true, 
    hasQuiz: true, 
    quizScore: 7, 
    quizTotal: 10 
  },
  { 
    id: '6', 
    title: 'Spread & Rest Operators', 
    content: '# Spread & Rest Operators\n\n## Spread (...)\n```js\nconst arr1 = [1, 2, 3];\nconst arr2 = [...arr1, 4, 5]; // [1, 2, 3, 4, 5]\n\nconst obj1 = { a: 1, b: 2 };\nconst obj2 = { ...obj1, c: 3 }; // { a: 1, b: 2, c: 3 }\n```\n\n## Rest (...)\n```js\nfunction sumar(...numeros) {\n  return numeros.reduce((a, b) => a + b, 0);\n}\n```', 
    order: 5, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '7', 
    title: 'Promesas', 
    content: '# Promesas\n\n## Estados\n- **Pending**: En progreso\n- **Fulfilled**: Completada con \u00e9xito\n- **Rejected**: Fall\u00f3\n\n## Creaci\u00f3n\n```js\nconst promesa = new Promise((resolve, reject) => {\n  setTimeout(() => resolve("Éxito"), 1000);\n});\n```\n\n## Consumo\n```js\npromesa\n  .then(resultado => console.log(resultado))\n  .catch(error => console.error(error));\n```', 
    order: 6, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '8', 
    title: 'Async/Await', 
    content: '# Async/Await\n\n## Sintaxis\n```js\nasync function obtenerDatos() {\n  try {\n    const respuesta = await fetch("/api/datos");\n    const datos = await respuesta.json();\n    return datos;\n  } catch (error) {\n    console.error(error);\n  }\n}\n```\n\n## Ventajas\n- C\u00f3digo m\u00e1s legible\n- Manejo de errores con try/catch\n- Debugging m\u00e1s f\u00e1cil', 
    order: 7, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '9', 
    title: 'M\u00f3dulos ES6', 
    content: '# M\u00f3dulos ES6\n\n## Exportar\n```js\n// exportaciones nombradas\nexport const PI = 3.14159;\nexport function sumar(a, b) { return a + b; }\n\n// exportaci\u00f3n por defecto\nexport default class Calculadora {}\n```\n\n## Importar\n```js\nimport { PI, sumar } from "./matematicas.js";\nimport Calculadora from "./calculadora.js";\nimport * as Mat from "./matematicas.js";\n```', 
    order: 8, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '10', 
    title: 'Clases', 
    content: '# Clases\n\n## Sintaxis\n```js\nclass Animal {\n  constructor(nombre) {\n    this.nombre = nombre;\n  }\n  \n  hablar() {\n    return `${this.nombre} hace un sonido`;\n  }\n}\n\nclass Perro extends Animal {\n  constructor(nombre, raza) {\n    super(nombre);\n    this.raza = raza;\n  }\n  \n  hablar() {\n    return `${this.nombre} ladra`;\n  }\n}\n```', 
    order: 9, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '11', 
    title: 'Map & Set', 
    content: '# Map & Set\n\n## Map\n```js\nconst mapa = new Map();\nmapa.set("clave", "valor");\nmapa.get("clave"); // "valor"\nmapa.has("clave"); // true\n```\n\n## Set\n```js\nconst conjunto = new Set([1, 2, 2, 3]); // {1, 2, 3}\nconjunto.add(4);\nconjunto.has(2); // true\n```', 
    order: 10, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '12', 
    title: 'Iteradores y Generadores', 
    content: '# Iteradores y Generadores\n\n## Iteradores\n```js\nconst iterable = {\n  *[Symbol.iterator]() {\n    yield 1;\n    yield 2;\n    yield 3;\n  }\n};\n```\n\n## Generadores\n```js\nfunction* generador() {\n  yield 1;\n  yield 2;\n  return 3;\n}\n```', 
    order: 11, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '13', 
    title: 'Proxy & Reflect', 
    content: '# Proxy & Reflect\n\n## Proxy\n```js\nconst objetivo = { nombre: "Juan" };\nconst handler = {\n  get(obj, prop) {\n    return prop in obj ? obj[prop] : `Propiedad ${prop} no existe`;\n  }\n};\nconst proxy = new Proxy(objetivo, handler);\n```', 
    order: 12, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '14', 
    title: 'S\u00edmbolos', 
    content: '# S\u00edmbolos\n\n## Propiedades \u00fanicas\n```js\nconst id = Symbol("id");\nconst usuario = {\n  [id]: 123,\n  nombre: "Juan"\n};\n```\n\n## Well-known Symbols\n- Symbol.iterator\n- Symbol.toStringTag\n- Symbol.asyncIterator', 
    order: 13, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '14', 
    title: 'WeakMap & WeakSet', 
    content: '# WeakMap & WeakSet\n\n## WeakMap\n- Claves solo objetos\n- No evitan garbage collection\n- No iterables\n\n## WeakSet\n- Solo objetos\n- Mismos principios que WeakMap', 
    order: 14, 
    completed: false, 
    hasQuiz: true 
  },
  { 
    id: '15', 
    title: 'Proyecto Final: Task Manager', 
    content: '# Proyecto Final: Task Manager CLI\n\n## Objetivo\nConstruir un gestor de tareas en l\u00ednea de comandos usando todo lo aprendido.\n\n## Requisitos\n- [ ] CRUD completo (Crear, Leer, Actualizar, Borrar)\n- [ ] Persistencia en JSON\n- [ ] Comandos: add, list, complete, delete\n- [ ] Validaci\u00f3n de entrada\n- [ ] Tests unitarios\n- [ ] Documentaci\u00f3n\n\n## Estructura\n```\ntask-manager/\n\u251c\u2500\u2500 src/\n\u2502   \u251c\u2500\u2500 index.js\n\u2502   \u251c\u2500\u2500 commands/\n\u2502   \u251c\u2500\u2500 storage/\n\u2502   \u251c\u2500\u2500 utils/\n\u2502   \u251c\u2500\u2500 tests/\n\u251c\u2500\u2500 package.json\n\u251c\u2500\u2500 README.md\n```', 
    order: 15, 
    completed: false, 
    hasQuiz: false 
  },
];