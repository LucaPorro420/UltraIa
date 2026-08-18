/**
 * Capability `libros` — catálogo determinista de libros gratuitos de programación en español.
 *
 * Fuente: enlaces.txt L826 → github.com/midudev/libros-programacion-gratis (librosgratis.dev).
 * Port ORIGINAL del PATRÓN (catálogo curado con formato uniforme [Título](url) — Autor · Formato,
 * secciones con descripción, categorías, reglas de propuesta de recursos). Los DATOS son el
 * catálogo público del README (115 recursos / 32 secciones / 8 categorías); la implementación
 * (búsqueda con score, agregación, validación) es propia. Keyless, cero I/O, determinista.
 */

export interface Libro {
  /** Id de sección (slug, ver SECCIONES_LIBROS). */
  seccion: string;
  titulo: string;
  autor?: string;
  url: string;
  formato?: string;
}

export interface SeccionLibros {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
}

export interface CategoriaLibros {
  id: string;
  nombre: string;
  secciones: number;
  total: number;
}

export interface BuscarLibrosOpts {
  seccion?: string;
  formato?: string;
  max?: number;
}

export interface PropuestaLibro {
  titulo: string;
  autor?: string;
  url: string;
  formato: string;
  gratis: boolean;
  espanol: boolean;
}

export interface ValidacionPropuesta {
  ok: boolean;
  errores: string[];
}

/** Formatos aceptados en propuestas (README: PDF, HTML, ePub, etc.). */
export const FORMATOS_LIBRO = ['PDF', 'HTML', 'ePub', 'eBook'] as const;

/** Secciones del catálogo (32) con descripción (del README) y categoría. */
export const SECCIONES_LIBROS: SeccionLibros[] = [
  { id: 'generales', titulo: 'Generales', descripcion: 'Para abrir apetito, mejorar criterio y aprender a pensar mejor como programador.', categoria: 'fundamentos' },
  { id: 'algoritmos', titulo: 'Algoritmos y estructuras de datos', descripcion: 'Lógica, pseudocódigo, POO, análisis de algoritmos y estructuras para resolver mejor.', categoria: 'fundamentos' },
  { id: 'sistemas-operativos', titulo: 'Sistemas operativos', descripcion: 'Procesos, memoria, archivos y concurrencia para entender qué hay debajo del stack.', categoria: 'fundamentos' },
  { id: 'metodologias', titulo: 'Metodologías de desarrollo', descripcion: 'Scrum, XP y prácticas de equipo para construir software de forma sostenible.', categoria: 'fundamentos' },
  { id: 'html-css', titulo: 'HTML y CSS', descripcion: 'Maquetación, estilos e interfaces web desde fundamentos hasta CSS moderno.', categoria: 'desarrollo-web' },
  { id: 'javascript', titulo: 'JavaScript', descripcion: 'La puerta de entrada a la web moderna, desde fundamentos hasta buenas prácticas.', categoria: 'lenguajes' },
  { id: 'typescript', titulo: 'TypeScript', descripcion: 'Tipos, tooling y confianza para escalar aplicaciones front y back.', categoria: 'lenguajes' },
  { id: 'python', titulo: 'Python', descripcion: 'Automatización, análisis y backend con una curva de entrada muy amable.', categoria: 'lenguajes' },
  { id: 'ruby', titulo: 'Ruby', descripcion: 'Sintaxis elegante y una manera de programar muy orientada a la legibilidad.', categoria: 'lenguajes' },
  { id: 'rust', titulo: 'Rust', descripcion: 'Rendimiento, seguridad de memoria y una comunidad técnica con mucha calidad.', categoria: 'lenguajes' },
  { id: 'blockchain', titulo: 'Blockchain', descripcion: 'Descentralización, contratos inteligentes y criptografía aplicada.', categoria: 'lenguajes' },
  { id: 'php', titulo: 'PHP', descripcion: 'Backend pragmático con mucha historia y recursos excelentes para aprender bien.', categoria: 'lenguajes' },
  { id: 'haskell', titulo: 'Haskell', descripcion: 'Pensamiento funcional duro y puro para expandir cómo entiendes el código.', categoria: 'lenguajes' },
  { id: 'golang', titulo: 'Golang', descripcion: 'Concurrencia, simplicidad y tooling impecable para servicios y utilidades.', categoria: 'lenguajes' },
  { id: 'kotlin', titulo: 'Kotlin', descripcion: 'Android moderno y una sintaxis muy agradable para aplicaciones robustas.', categoria: 'lenguajes' },
  { id: 'c', titulo: 'C', descripcion: 'Fundamentos de bajo nivel, memoria y pensamiento cercano al sistema.', categoria: 'lenguajes' },
  { id: 'cplusplus', titulo: 'C++', descripcion: 'Orientación a objetos, eficiencia y bases para software de alto rendimiento.', categoria: 'lenguajes' },
  { id: 'csharp', titulo: 'C#', descripcion: 'Programación moderna sobre .NET, desde consola hasta backend web.', categoria: 'lenguajes' },
  { id: 'java', titulo: 'Java', descripcion: 'Una base muy sólida para aprender orientación a objetos y ecosistemas empresariales.', categoria: 'lenguajes' },
  { id: 'r', titulo: 'R', descripcion: 'Análisis de datos y visualización para quien quiere ir directo al insight.', categoria: 'lenguajes' },
  { id: 'android', titulo: 'Android', descripcion: 'Desarrollo de aplicaciones Android con guías prácticas en español.', categoria: 'plataformas' },
  { id: 'react', titulo: 'React', descripcion: 'Componentes, estado y patrones para crear interfaces ricas y mantenibles.', categoria: 'frameworks' },
  { id: 'qwik', titulo: 'Qwik', descripcion: 'Performance extrema y carga diferida para experiencias rapidísimas.', categoria: 'frameworks' },
  { id: 'nodejs', titulo: 'Node.js', descripcion: 'Backend JavaScript, asincronía y fundamentos para escribir servicios con Node.', categoria: 'frameworks' },
  { id: 'angular', titulo: 'Angular', descripcion: 'Arquitectura frontend con TypeScript, componentes y patrones de aplicación.', categoria: 'frameworks' },
  { id: 'django', titulo: 'Django', descripcion: 'Backend web con Python, desde el tutorial oficial hasta proyectos guiados.', categoria: 'frameworks' },
  { id: 'git', titulo: 'Git', descripcion: 'Versionado bien aprendido para colaborar sin miedo a romper nada.', categoria: 'herramientas' },
  { id: 'docker', titulo: 'Docker', descripcion: 'Contenedores, imágenes y flujos reproducibles para desarrollo y despliegue.', categoria: 'herramientas' },
  { id: 'linux', titulo: 'Linux y terminal', descripcion: 'Sistema, shell y fundamentos para moverte con soltura en entornos Unix.', categoria: 'herramientas' },
  { id: 'sql', titulo: 'SQL', descripcion: 'Consultas, modelado y fundamentos imprescindibles para cualquier stack.', categoria: 'bases-datos' },
  { id: 'nosql', titulo: 'NoSQL', descripcion: 'MongoDB, Redis y modelos no relacionales para ampliar la caja de herramientas.', categoria: 'bases-datos' },
  { id: 'ia', titulo: 'Inteligencia Artificial', descripcion: 'Fundamentos de aprendizaje automático, agentes y razonamiento computacional.', categoria: 'ia-datos' },
];

/** Catálogo completo: 115 recursos gratuitos de programación en español (librosgratis.dev, 18/08/2026). */
export const LIBROS: Libro[] = [
  { seccion: 'generales', titulo: '97 cosas que todo programador debe saber', autor: 'Kevlin Henney', url: 'https://97cosas.com/programador/', formato: undefined },
  { seccion: 'generales', titulo: '100cosasdev', autor: 'midudev', url: 'https://100cosas.dev/', formato: undefined },
  { seccion: 'generales', titulo: 'Los apuntes de Majo', autor: 'Majo Ledesma', url: 'https://losapuntesdemajo.vercel.app/', formato: undefined },
  { seccion: 'algoritmos', titulo: 'Diseño de Algoritmos en Pseudocódigo y Ordinogramas', autor: 'Carlos Pes', url: 'https://librosgratis.dev/books/algoritmos-pseudocodigo-ordinogramas.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Estructuras de datos', autor: 'Luis Fernando Zapata Alvarez', url: 'https://librosgratis.dev/books/estructuras-de-datos.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Problemas y Algoritmos', autor: 'Luis E. Vargas Azcona', url: 'https://librosgratis.dev/books/problemas-y-algoritmos.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Las bases conceptuales de la Programación', autor: 'Pablo E. “Fidel” Martínez López', url: 'https://librosgratis.dev/books/bases-conceptuales-programacion.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Introducción a la Lógica de Programación', autor: 'Jorge O. Herrera M., Julián E. Gutiérrez P., Robinson Pulgarín G.', url: 'https://librosgratis.dev/books/logica-de-programacion.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Fundamentos de la programación', autor: 'Luis Hernández Yáñez', url: 'https://librosgratis.dev/books/fundamentos-programacion.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Introducción a la programación orientada a objetos', autor: 'Vicent Moncho Mas', url: 'https://librosgratis.dev/books/introduccion-poo.pdf', formato: 'PDF' },
  { seccion: 'algoritmos', titulo: 'Apuntes de Estructuras de Datos y Algoritmos', autor: 'Javier Campos', url: 'https://librosgratis.dev/books/apuntes-estructuras-datos-algoritmos.pdf', formato: 'PDF' },
  { seccion: 'html-css', titulo: 'Diseño de Interfaces Web', autor: 'Pedro Prieto', url: 'http://interfacesweb.github.io/unidades/', formato: 'HTML' },
  { seccion: 'html-css', titulo: 'Estructura con CSS', autor: 'Learn CSS Layout, traducido al español', url: 'https://es.learnlayout.com/', formato: 'HTML' },
  { seccion: 'html-css', titulo: 'MDN: HTML', autor: 'MDN Web Docs', url: 'https://developer.mozilla.org/es/docs/Web/HTML', formato: 'HTML' },
  { seccion: 'html-css', titulo: 'MDN: CSS', autor: 'MDN Web Docs', url: 'https://developer.mozilla.org/es/docs/Web/CSS', formato: 'HTML' },
  { seccion: 'javascript', titulo: 'JavaScript elocuente (Cuarta edición)', autor: 'Marijn Haverbeke', url: 'https://librosgratis.dev/books/javascript-elocuente-cuarta-edicion.pdf', formato: 'PDF' },
  { seccion: 'javascript', titulo: 'JavaScript, ¡Inspírate!', autor: 'Ulises Gascón', url: 'https://leanpub.com/javascript-inspirate', formato: 'eBook' },
  { seccion: 'javascript', titulo: 'JavaScript Moderno', autor: 'Ilya Kantor', url: 'https://es.javascript.info/', formato: 'HTML' },
  { seccion: 'javascript', titulo: 'You Don’t Know JS (traducción al español)', autor: 'Kyle Simpson, traducido por You-Dont-Know-JS-ES', url: 'https://github.com/You-Dont-Know-JS-ES/Traduccion', formato: 'HTML' },
  { seccion: 'javascript', titulo: 'MDN: Guía de JavaScript', autor: undefined, url: 'https://developer.mozilla.org/es/docs/Web/JavaScript/Guide', formato: 'HTML' },
  { seccion: 'javascript', titulo: 'Learn JavaScript', autor: 'Suman Kunwar', url: 'https://javascript.sumankunwar.com.np/es', formato: 'HTML' },
  { seccion: 'javascript', titulo: 'Introducción a JavaScript', autor: 'Javier Eguíluz Pérez', url: 'https://librosgratis.dev/books/javascript-introduccion-eguiluz.pdf', formato: 'PDF' },
  { seccion: 'javascript', titulo: 'JavaScript', autor: 'Jordi Collell Puig y Anna Ferry Mestres', url: 'https://librosgratis.dev/books/javascript-uoc.pdf', formato: 'PDF' },
  { seccion: 'javascript', titulo: 'Asincronismo en JavaScript', autor: 'Charly Cimino', url: 'https://librosgratis.dev/books/javascript-asincronismo.pdf', formato: 'PDF' },
  { seccion: 'javascript', titulo: 'Fundamentos de jQuery', autor: 'Rebecca Murphey, traducido por Leandro D’Onofrio', url: 'https://librosgratis.dev/books/jquery-fundamentos.pdf', formato: 'PDF' },
  { seccion: 'javascript', titulo: 'CSS3 y Javascript avanzado', autor: 'Jordi Collell Puig', url: 'https://librosgratis.dev/books/css3-javascript-avanzado.pdf', formato: 'PDF' },
  { seccion: 'javascript', titulo: 'Full Stack Open', autor: 'Universidad de Helsinki, traducido por Sebastian Torres, Cynthia Vico Vacca y Pablo Maffioli', url: 'https://fullstackopen.com/es/', formato: 'HTML' },
  { seccion: 'javascript', titulo: 'Clean Code JavaScript en Español', autor: 'Ryan McDermott, traducido por Theodore Anderson', url: 'https://github.com/andersontr15/clean-code-javascript-es', formato: 'HTML' },
  { seccion: 'typescript', titulo: 'Introducción a TypeScript', autor: 'Emmanuel Valverde Ramos', url: 'https://khru.gitbooks.io/typescript/', formato: 'HTML' },
  { seccion: 'typescript', titulo: 'TypeScript en Profundidad', autor: 'Basarat Ali Syed, traducido por Melissa Rofman', url: 'https://github.com/melissarofman/typescript-book', formato: 'HTML' },
  { seccion: 'typescript', titulo: 'Introducción a TypeScript', autor: 'Adictos al trabajo', url: 'https://mega.nz/file/TldlTZID#1A90Wn8xYloDvekX8rQewI3Yh8HMJXlufRUEWEcOzNU', formato: undefined },
  { seccion: 'typescript', titulo: 'TypeScript para Principiantes', autor: 'Envato Tuts+', url: 'https://mega.nz/file/7hdwEY6b#ESsixH9wCUFhUugkRq8BEa1uZlzFXCJX6QxHdL5Yz9Q', formato: undefined },
  { seccion: 'typescript', titulo: 'Manual de TypeScript', autor: 'Emmanuel Valverde y Pedro Hernández-Mora', url: 'https://mega.nz/#!qwcFDZ7a!ggLXIZ4c-O1Do0OEuvK0Mz8k39LvYQwdaJ2LtKKxgsE', formato: undefined },
  { seccion: 'typescript', titulo: 'Uso avanzado de TypeScript en un ejemplo real', autor: 'Nelio Software', url: 'https://neliosoftware.com/es/blog/uso-avanzado-de-typescript/', formato: 'HTML' },
  { seccion: 'typescript', titulo: 'Aprendizaje TypeScript', autor: 'RipTutorial', url: 'https://librosgratis.dev/books/typescript-aprendizaje.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Aprende Python', autor: 'Sergio Delgado Quintero', url: 'https://uneweb.edu.ve/tuto-docs/libro-python.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Python para todos', autor: 'Raúl González Duque', url: 'https://librosgratis.dev/books/python-para-todos.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Aprenda a pensar como un programador con Python', autor: 'Allen Downey, Jeffrey Elkner, Chris Meyers', url: 'https://librosgratis.dev/books/python-pensar-programador.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Python para todos, Explorando la información con Python 3', autor: 'Charles R. Severance', url: 'https://librosgratis.dev/books/python-explorando-informacion.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Manual básico, iniciación a Python 3', autor: 'José Miguel Ruiz Torres', url: 'https://librosgratis.dev/books/python-manual-basico.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Python Intermedio', autor: 'Comunidad ellibrodepython.com', url: 'https://librosgratis.dev/books/python-intermedio.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Inmersión en Python 3', autor: 'Mark Pilgrim, traducido por José Miguel González Aguilera', url: 'https://librosgratis.dev/books/python-inmersion.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Ejercicios básicos de programación resueltos en Python', autor: undefined, url: 'https://librosgratis.dev/books/python-ejercicios-basicos.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Introducción a Python para cálculo científico', autor: 'A. Garcimartín', url: 'https://librosgratis.dev/books/python-calculo-cientifico.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Introducción a la programación con Python 3', autor: 'Andrés Marzal Varó, Isabel Gracia Luengo, Pedro García Sevilla', url: 'https://librosgratis.dev/books/python-introduccion-programacion-3.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Apuntes Python', autor: 'Manuel Vergara', url: 'https://librosgratis.dev/books/python-apuntes.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'Inventa tus propios juegos de computadora con Python', autor: 'Al Sweigart', url: 'https://librosgratis.dev/books/python-inventa-juegos.pdf', formato: 'PDF' },
  { seccion: 'python', titulo: 'El tutorial de Python', autor: 'Python Software Foundation', url: 'https://docs.python.org/es/3/tutorial/', formato: 'HTML' },
  { seccion: 'ruby', titulo: 'Aprende a programar con Ruby', autor: 'RubySur', url: 'http://rubysur.org/aprende.a.programar', formato: 'HTML' },
  { seccion: 'ruby', titulo: 'Ruby en veinte minutos', autor: 'Ruby', url: 'https://www.ruby-lang.org/es/documentation/quickstart/', formato: 'HTML' },
  { seccion: 'ruby', titulo: 'Introducción a Rails', autor: 'RubySur', url: 'http://rubysur.org/introduccion.a.rails/', formato: 'HTML' },
  { seccion: 'rust', titulo: 'Aprendizaje Rust', autor: 'RipTutorial', url: 'https://librosgratis.dev/books/rust-aprendizaje.pdf', formato: 'PDF' },
  { seccion: 'rust', titulo: 'El Lenguaje de Programación Rust - 2016', autor: 'Jose Narvaez', url: 'https://goyox86.github.io/elpr/README.html', formato: 'HTML' },
  { seccion: 'rust', titulo: 'El Lenguaje de Programación Rust - 2024', autor: 'Libro oficial traducido por RustLang en Español', url: 'https://book.rustlang-es.org', formato: 'HTML, PDF' },
  { seccion: 'rust', titulo: 'Comprehensive Rust', autor: 'Google', url: 'https://google.github.io/comprehensive-rust/es/', formato: 'HTML, PDF' },
  { seccion: 'rust', titulo: 'Rust para C#/.NET Developers', autor: 'Microsoft, traducido por RustLang en Español', url: 'https://dotnet-book.rustlang-es.org', formato: 'HTML, PDF' },
  { seccion: 'blockchain', titulo: 'Bitcoin: Un sistema de efectivo electrónico de usuario a usuario', autor: 'Satoshi Nakamoto', url: 'https://bitcoin.org/files/bitcoin-paper/bitcoin_es.pdf', formato: 'PDF' },
  { seccion: 'blockchain', titulo: 'El Libro de Satoshi', autor: 'Phil Champagne', url: 'http://www.libroblockchain.com/satoshi/', formato: 'HTML' },
  { seccion: 'blockchain', titulo: 'Entendiendo el Blockchain', autor: 'SECMCA', url: 'https://www.secmca.org/wp-content/uploads/2019/12/Blockchain.pdf', formato: 'PDF' },
  { seccion: 'blockchain', titulo: 'Solidity: Documentación oficial en español', autor: undefined, url: 'https://solidity-es.readthedocs.io/', formato: 'HTML' },
  { seccion: 'php', titulo: 'PHP, la manera correcta', autor: 'Josh Lockhart, Phil Sturgeon', url: 'https://phpdevenezuela.github.io/php-the-right-way/', formato: 'HTML' },
  { seccion: 'php', titulo: 'Programación en PHP a través de ejemplos', autor: 'Manuel Palomo Duarte, Ildefonso Montero Pérez', url: 'https://librosgratis.dev/books/php-programacion-ejemplos.pdf', formato: 'PDF' },
  { seccion: 'php', titulo: 'POO y MVC en PHP', autor: 'Eugenia Bahit', url: 'https://librosgratis.dev/books/php-poo-mvc.pdf', formato: 'PDF' },
  { seccion: 'php', titulo: 'Laboratorio de PHP y MySQL', autor: 'Piero Berni Millet, Dídac Gil de la Iglesia', url: 'https://openlibro.com/wp-content/uploads/2026/03/laboratorio-php-mysql.pdf', formato: 'PDF' },
  { seccion: 'haskell', titulo: 'Piensa en Haskell', autor: 'José A. Alonso Jiménez, Mª José Hidalgo Doblado', url: 'https://librosgratis.dev/books/haskell-piensa.pdf', formato: 'PDF' },
  { seccion: 'haskell', titulo: '¡Aprende Haskell por el bien de todos!', autor: undefined, url: 'http://aprendehaskell.es/main.html', formato: 'HTML' },
  { seccion: 'haskell', titulo: 'Piensa en Haskell y en Python', autor: 'José A. Alonso Jiménez', url: 'https://librosgratis.dev/books/haskell-python-ejercicios.pdf', formato: 'PDF' },
  { seccion: 'golang', titulo: 'El pequeño libro de Go', autor: 'Karl Seguin, traducido por Raúl Exposito', url: 'https://librosgratis.dev/books/go-pequeno-libro.pdf', formato: 'PDF' },
  { seccion: 'golang', titulo: 'Go en Español', autor: 'Nacho Pacheco', url: 'https://nachopacheco.gitbooks.io/go-es/content/doc/', formato: undefined },
  { seccion: 'kotlin', titulo: 'Curso programación Android en Kotlin', autor: 'AristiDevs', url: 'https://cursokotlin.com/curso-programacion-kotlin-android/', formato: 'HTML' },
  { seccion: 'kotlin', titulo: 'Kotlin', autor: 'Stack Overflow Documentation', url: 'https://librosgratis.dev/books/kotlin-stackoverflow-docs.pdf', formato: 'PDF' },
  { seccion: 'android', titulo: 'Manual Programación Android', autor: 'Salvador Gómez Oliver', url: 'https://aluzardo.github.io/trabajo-fin-de-grado/Tutoriales/Manual%20Programacion%20Android.pdf', formato: 'PDF' },
  { seccion: 'android', titulo: 'Curso sobre los aspectos básicos de Android con Compose', autor: 'Android Developers', url: 'https://developer.android.com/courses/android-basics-compose/course?hl=es-419', formato: 'HTML' },
  { seccion: 'c', titulo: 'Introducción a la Programación con C', autor: 'Andrés Marzal e Isabel Gracia', url: 'https://librosgratis.dev/books/c-introduccion-programacion.pdf', formato: 'PDF' },
  { seccion: 'cplusplus', titulo: 'C++ estándar', autor: 'Miguel Hernando Gutiérrez', url: 'https://librosgratis.dev/books/cpp-estandar.pdf', formato: 'PDF' },
  { seccion: 'cplusplus', titulo: 'Programación orientada a objetos Ejercicios propuestos con C++', autor: 'Cristina Cachero, Pedro J. Ponce de León', url: 'https://librosgratis.dev/books/cpp-poo-ejercicios.pdf', formato: 'PDF' },
  { seccion: 'cplusplus', titulo: 'Fundamentos Básicos de Programación en C++', autor: 'Francisco Martínez del Río', url: 'https://librosgratis.dev/books/cpp-fundamentos-basicos.pdf', formato: 'PDF' },
  { seccion: 'cplusplus', titulo: 'Curso de C++', autor: 'Con Clase', url: 'https://conclase.net/c/curso', formato: 'HTML' },
  { seccion: 'csharp', titulo: 'Introducción a la programación con C#', autor: 'Nacho Cabanes', url: 'https://librosgratis.dev/books/csharp-introduccion-programacion.pdf', formato: 'PDF' },
  { seccion: 'csharp', titulo: 'El pequeño libro de ASP.NET Core', autor: 'Nate Barbettini', url: 'https://librosgratis.dev/books/aspnet-core-pequeno-libro.pdf', formato: 'PDF' },
  { seccion: 'java', titulo: 'Fundamentos de programación en Java', autor: 'Jorge Martínez Ladrón', url: 'https://es.slideshare.net/slideshow/java-fundamentos/23333338', formato: 'PDF' },
  { seccion: 'java', titulo: 'Iniciando en Java: Programación para Todos', autor: 'Julián Camilo Tuta Diaz', url: 'https://librosgratis.dev/books/java-iniciando-programacion.pdf', formato: 'PDF' },
  { seccion: 'java', titulo: 'Java Apuntes Básicos', autor: 'Jorge A. López Vargas', url: 'https://librosgratis.dev/books/java-apuntes-basicos.pdf', formato: 'PDF' },
  { seccion: 'java', titulo: 'Java básico para aprendices', autor: 'Manuel Jesús Abanto Morales et al.', url: 'https://librosgratis.dev/books/java-basico-aprendices.pdf', formato: 'PDF' },
  { seccion: 'java', titulo: 'Introducción a la Programación Orientada a Objetos con Java', autor: 'Rafael Llobet Azpitarte, Pedro Alonso Jordá, Jaume Devesa Llinares, Emili Miedes De Elías, María Idoia Ruiz Fuertes, Francisco Torres Goterris', url: 'https://librosgratis.dev/books/java-introduccion-poo.pdf', formato: 'PDF' },
  { seccion: 'java', titulo: 'Ejercicios de Programación en Java', autor: 'Francisco Manuel Pérez Montes', url: 'https://librosgratis.dev/books/java-ejercicios-programacion.pdf', formato: 'PDF' },
  { seccion: 'r', titulo: 'R para Ciencia de Datos', autor: 'Hadley Wickham y Garrett Grolemund', url: 'https://es.r4ds.hadley.nz/', formato: 'HTML' },
  { seccion: 'r', titulo: 'Introducción a R', autor: 'Andrés González y Silvia González', url: 'https://librosgratis.dev/books/r-introduccion.pdf', formato: 'PDF' },
  { seccion: 'react', titulo: 'React: De aprendiz a maestro', autor: 'Raúl Expósito', url: 'https://librosgratis.dev/books/react-aprendiz-maestro.pdf', formato: 'PDF' },
  { seccion: 'react', titulo: 'React', autor: 'Stack Overflow Documentation', url: 'https://librosgratis.dev/books/react-stackoverflow-docs.pdf', formato: 'PDF' },
  { seccion: 'react', titulo: 'Preguntas de entrevista de React.js', autor: 'Miguel Ángel Durán', url: 'https://www.reactjs.wiki/', formato: 'HTML' },
  { seccion: 'react', titulo: 'Desarrollo de Aplicaciones Web con React.js y Redux.js', autor: 'Sergio Daniel Xalambrí', url: 'https://leanpub.com/read/react-redux', formato: 'HTML' },
  { seccion: 'qwik', titulo: 'Qwik: Desde cero a producción', autor: 'Anartz Mugika', url: 'https://qwik-book-spanish.netlify.app/', formato: 'HTML' },
  { seccion: 'nodejs', titulo: 'Node Beginner Book', autor: 'Manuel Kiessling', url: 'https://www.nodebeginner.org/index-es.html', formato: 'HTML' },
  { seccion: 'angular', titulo: 'Entendiendo Angular', autor: 'Jorge Cano', url: 'https://jorgeucano.gitbook.io/entendiendo-angular/', formato: 'HTML' },
  { seccion: 'django', titulo: 'Django documentation', autor: 'Django Software Foundation', url: 'https://docs.djangoproject.com/es/stable/', formato: 'HTML' },
  { seccion: 'django', titulo: 'Tutorial de Django Girls', autor: 'Django Girls', url: 'https://tutorial.djangogirls.org/es/', formato: 'HTML' },
  { seccion: 'git', titulo: 'Pro Git', autor: 'Scott Chacon y Ben Straub', url: 'https://librosgratis.dev/books/git-pro.pdf', formato: 'PDF' },
  { seccion: 'git', titulo: 'Git, la guía sencilla', autor: 'Roger Dudler', url: 'https://rogerdudler.github.io/git-guide/index.es.html', formato: 'HTML' },
  { seccion: 'git', titulo: 'Git Immersion en español', autor: undefined, url: 'https://esparta.github.io/gitimmersion-spanish/', formato: 'HTML' },
  { seccion: 'git', titulo: 'Git Magic', autor: 'Ben Lynn', url: 'http://www-cs-students.stanford.edu/~blynn/gitmagic/intl/es/', formato: 'HTML' },
  { seccion: 'docker', titulo: 'Docker en español', autor: 'Bruno Cascio', url: 'https://github.com/brunocascio/docker-espanol', formato: 'HTML' },
  { seccion: 'docker', titulo: 'Introducción a Docker', autor: 'RedIRIS', url: 'https://librosgratis.dev/books/docker-introduccion.pdf', formato: 'PDF' },
  { seccion: 'linux', titulo: 'El libro del administrador de Debian', autor: 'Raphaël Hertzog y Roland Mas', url: 'https://debian-handbook.info/browse/es-ES/stable/', formato: 'HTML' },
  { seccion: 'linux', titulo: 'El Manual de BASH Scripting Básico para Principiantes', autor: 'Wikilibros', url: 'https://es.wikibooks.org/wiki/El_Manual_de_BASH_Scripting_B%C3%A1sico_para_Principiantes', formato: 'HTML' },
  { seccion: 'sql', titulo: 'Tutorial de SQL', autor: 'Rubén Alvarez', url: 'http://www.desarrolloweb.com/manuales/9/', formato: undefined },
  { seccion: 'sql', titulo: 'Manual de SQL', autor: 'Jorge Sanchez Asenjo', url: 'http://jorgesanchez.net/manuales/sql/intro-sql-sql2016.html', formato: undefined },
  { seccion: 'sql', titulo: 'Apuntes básicos de SQL', autor: 'Unai Estébanez', url: 'https://librosgratis.dev/books/sql-apuntes-basicos.pdf', formato: 'PDF' },
  { seccion: 'sql', titulo: 'Introducción al diseño de bases de datos', autor: 'Jordi Casas Roma', url: 'https://librosgratis.dev/books/bases-datos-diseno-introduccion.pdf', formato: 'PDF' },
  { seccion: 'nosql', titulo: 'El pequeño libro de MongoDB', autor: 'Karl Seguin, traducido por Osledy Bazo', url: 'https://github.com/uokesita/the-little-mongodb-book', formato: 'HTML' },
  { seccion: 'nosql', titulo: 'El pequeño libro de Redis en castellano', autor: 'Karl Seguin, traducido por Raúl Expósito', url: 'https://raulexposito.com/the-little-redis-book-en-castellano.html', formato: 'HTML' },
  { seccion: 'sistemas-operativos', titulo: 'Sistemas Operativos', autor: 'Gunnar Wolf, Esteban Ruiz, Federico Bergero, Erwin Meza', url: 'https://librosgratis.dev/books/sistemas-operativos-wolf.pdf', formato: 'PDF' },
  { seccion: 'ia', titulo: 'Inteligencia Artificial: un enfoque moderno', autor: 'Peter Norvig y Stuart Russell, adaptación abierta', url: 'https://iaarbook.github.io/', formato: 'HTML' },
  { seccion: 'metodologias', titulo: 'Guía Scrum', autor: 'EuropeanScrum.org', url: 'https://librosgratis.dev/books/guia-scrum-european.pdf', formato: 'PDF' },
  { seccion: 'metodologias', titulo: 'Scrum y XP desde las trincheras', autor: 'Henrik Kniberg', url: 'https://librosgratis.dev/books/scrum-y-xp-desde-las-trincheras.pdf', formato: 'PDF' },
];

/** Categorías del catálogo (8) con conteos COMPUTADOS de los datos (no hardcodeados). */
export const CATEGORIAS_LIBROS: { id: string; nombre: string }[] = [
  { id: 'fundamentos', nombre: 'Fundamentos' },
  { id: 'desarrollo-web', nombre: 'Desarrollo web' },
  { id: 'lenguajes', nombre: 'Lenguajes' },
  { id: 'plataformas', nombre: 'Plataformas' },
  { id: 'frameworks', nombre: 'Frameworks' },
  { id: 'herramientas', nombre: 'Herramientas' },
  { id: 'bases-datos', nombre: 'Bases de datos' },
  { id: 'ia-datos', nombre: 'IA y datos' },
];

function quitarAcentos(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Resuelve un id o título de sección a su id canónico (case/accent-insensitive). */
export function normalizarSeccion(ref: string): string | undefined {
  const q = quitarAcentos(ref.trim());
  for (const s of SECCIONES_LIBROS) {
    if (s.id === q || quitarAcentos(s.titulo) === q) return s.id;
  }
  return undefined;
}

function seccionDe(libro: Libro): SeccionLibros | undefined {
  return SECCIONES_LIBROS.find((s) => s.id === libro.seccion);
}

/**
 * Busca en el catálogo. Todos los términos (split por espacios) deben aparecer en
 * título, autor o sección (case/accent-insensitive). Orden: score desc (título 3,
 * autor 2, sección 1), luego título asc. Filtros opcionales por sección y formato.
 */
export function buscarLibros(query: string, opts?: BuscarLibrosOpts): Libro[] {
  const terminos = query.trim().split(/\s+/).filter(Boolean).map(quitarAcentos);
  const seccionId = opts?.seccion ? normalizarSeccion(opts.seccion) : undefined;
  const formatoQ = opts?.formato ? quitarAcentos(opts.formato.trim()) : undefined;
  const max = Math.max(1, opts?.max ?? 20);

  const scored: { libro: Libro; score: number }[] = [];
  for (const libro of LIBROS) {
    if (seccionId !== undefined && libro.seccion !== seccionId) continue;
    if (formatoQ !== undefined && (!libro.formato || !quitarAcentos(libro.formato).includes(formatoQ))) continue;

    const titulo = quitarAcentos(libro.titulo);
    const autor = libro.autor ? quitarAcentos(libro.autor) : '';
    const seccion = quitarAcentos(seccionDe(libro)?.titulo ?? libro.seccion);

    let score = 0;
    let match = true;
    for (const t of terminos) {
      let s = 0;
      if (titulo.includes(t)) s = 3;
      else if (autor.includes(t)) s = 2;
      else if (seccion.includes(t)) s = 1;
      else {
        match = false;
        break;
      }
      score += s;
    }
    if (!match) continue;
    scored.push({ libro, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.libro.titulo.localeCompare(b.libro.titulo, 'es'))
    .slice(0, max)
    .map((s) => s.libro);
}

/** Recursos de una sección (id o título), en el orden del catálogo. */
export function librosPorSeccion(seccion: string): Libro[] {
  const id = normalizarSeccion(seccion);
  if (!id) return [];
  return LIBROS.filter((l) => l.seccion === id);
}

/** Agregación por categoría: conteos computados de LIBROS y SECCIONES_LIBROS. */
export function categoriasLibros(): CategoriaLibros[] {
  return CATEGORIAS_LIBROS.map((c) => {
    const secciones = SECCIONES_LIBROS.filter((s) => s.categoria === c.id);
    const total = secciones.reduce((acc, s) => acc + LIBROS.filter((l) => l.seccion === s.id).length, 0);
    return { id: c.id, nombre: c.nombre, secciones: secciones.length, total };
  });
}

/**
 * Valida una propuesta de recurso con las reglas del README ("Cómo proponer un recurso"):
 * título, autor o proyecto, enlace oficial, formato disponible, confirmación de que es
 * gratuito y en español.
 */
export function validarPropuestaLibro(p: PropuestaLibro): ValidacionPropuesta {
  const errores: string[] = [];
  const titulo = p.titulo.trim();
  if (titulo.length < 3) errores.push('El título es obligatorio (mínimo 3 caracteres).');

  if (p.autor !== undefined && p.autor.trim().length < 2) {
    errores.push('El autor o proyecto debe tener al menos 2 caracteres si se indica.');
  }

  let urlValida = false;
  try {
    const u = new URL(p.url);
    urlValida = u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    urlValida = false;
  }
  if (!urlValida) errores.push('El enlace oficial debe ser una URL http(s) válida.');

  const formatoQ = p.formato.trim().toLowerCase();
  if (!formatoQ) {
    errores.push('El formato es obligatorio (PDF, HTML, ePub o eBook).');
  } else {
    const tokens = formatoQ.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean);
    const validos = FORMATOS_LIBRO.map((f) => f.toLowerCase());
    if (tokens.length === 0 || tokens.some((t) => !validos.includes(t))) {
      errores.push(`Formato no válido: ${p.formato} (válidos: ${FORMATOS_LIBRO.join(', ')} o combinación "HTML, PDF").`);
    }
  }

  if (p.gratis !== true) errores.push('El recurso debe ser gratuito (gratis: true).');
  if (p.espanol !== true) errores.push('El recurso debe estar en español (espanol: true).');

  return { ok: errores.length === 0, errores };
}

/** Namespace de la capability `libros` (consumido por tools/index.ts). */
export const libros = {
  LIBROS,
  SECCIONES_LIBROS,
  CATEGORIAS_LIBROS,
  FORMATOS_LIBRO,
  buscarLibros,
  librosPorSeccion,
  categoriasLibros,
  normalizarSeccion,
  validarPropuestaLibro,
};