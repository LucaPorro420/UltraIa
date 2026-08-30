import type { Framework } from '../types';

export const laravel: Framework = {
  id: 'laravel',
  name: 'Laravel',
  category: 'backend',
  icon: '🟥',
  color: '#ff2d20',
  tagline: 'Framework PHP elegante y expresivo.',
  description:
    'Laravel trae Eloquent ORM, routing fluido, Blade y Artisan. El estándar de PHP moderno para construir apps web completas y APIs rápidamente.',
  modules: [
    {
      id: 'laravel-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Proyecto, rutas y vistas.',
      lessons: [
        {
          id: 'laravel-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Crea el proyecto con Composer.',
          topics: ['composer', 'artisan', 'serve'],
          content:
            `Laravel usa Composer para dependencias. Crea con 'composer create-project'.\n\n'php artisan serve' levanta el servidor de desarrollo.`,
          examples: [
            {
              lang: 'bash',
              code: `composer create-project laravel/laravel tienda
cd tienda
php artisan serve`,
              caption: 'Crear y servir Laravel.',
            },
          ],
        },
        {
          id: 'laravel-route',
          title: 'Rutas y controladores',
          level: 'basico',
          durationMin: 25,
          summary: 'Define rutas en routes/web.php.',
          topics: ['Route', 'controller', 'response'],
          content:
            `El archivo routes/web.php define la navegación.\n\nPuedes devolver arrays (JSON) o vistas Blade.`,
          examples: [
            {
              lang: 'php',
              code: `use Illuminate\\Support\\Facades\\Route;
Route::get('/saludo', function () {
    return response()->json(['msg' => 'hola mundo']);
});`,
              caption: 'Ruta con respuesta JSON.',
            },
          ],
        },
        {
          id: 'laravel-blade',
          title: 'Plantillas Blade',
          level: 'basico',
          durationMin: 20,
          summary: 'Vistas con directivas.',
          topics: ['Blade', 'view', 'directiva'],
          content:
            `Blade usa {{ }} para imprimir y @foreach para bucles.\n\nSepara presentación de lógica de forma limpia.`,
          examples: [
            {
              lang: 'php',
              code: `Route::get('/lista', function () {
    return view('lista', ['items' => ['A', 'B']]);
});
// en resources/views/lista.blade.php:
// @foreach ($items as $i) <li>{{ $i }}</li> @endforeach`,
              caption: 'Vista Blade con datos.',
            },
          ],
        },
      ],
    },
    {
      id: 'laravel-intermedio',
      title: 'Eloquent y datos',
      level: 'intermedio',
      summary: 'ORM, migraciones y formularios.',
      lessons: [
        {
          id: 'laravel-eloquent',
          title: 'Modelos Eloquent',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Entidades y consultas fluidas.',
          topics: ['Model', 'Eloquent', 'query'],
          content:
            `Eloquent mapea modelos a tablas con nombres en plural por convención.\n\nLas consultas son métodos encadenables y legibles.`,
          examples: [
            {
              lang: 'php',
              code: `use App\\Models\\Producto;
$baratos = Producto::where('precio', '<', 50)->orderBy('nombre')->get();
$primero = Producto::find(1);`,
              caption: 'Consultas con Eloquent.',
            },
          ],
        },
        {
          id: 'laravel-migration',
          title: 'Migraciones',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Esquema versionado.',
          topics: ['migration', 'schema', 'artisan'],
          content:
            `Las migraciones describen el esquema en código versionado.\n\n'php artisan migrate' lo aplica a la base.`,
          examples: [
            {
              lang: 'php',
              code: `Schema::create('productos', function (Blueprint $t) {
    $t->id();
    $t->string('nombre');
    $t->decimal('precio', 8, 2);
    $t->timestamps();
});`,
              caption: 'Migración de productos.',
            },
          ],
        },
        {
          id: 'laravel-request',
          title: 'Validación de requests',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Form Requests y reglas.',
          topics: ['validate', 'rules', 'errors'],
          content:
            `Valida con el helper request->validate y reglas declarativas.\n\nLaravel redirige con errores si la validación falla.`,
          examples: [
            {
              lang: 'php',
              code: `public function store(Request $request) {
    $data = $request->validate([
        'nombre' => 'required|string|max:100',
        'precio' => 'required|numeric|min:0',
    ]);
    Producto::create($data);
    return redirect()->back();
}`,
              caption: 'Validación en el controlador.',
            },
          ],
        },
      ],
    },
    {
      id: 'laravel-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'API, auth y colas.',
      lessons: [
        {
          id: 'laravel-api',
          title: 'API Resource y Sanctum',
          level: 'avanzado',
          durationMin: 30,
          summary: 'APIs JSON con recursos y auth.',
          topics: ['Resource', 'Sanctum', 'token'],
          content:
            `API Resources transforman modelos a JSON consistente.\n\nSanctum da tokens ligeros para SPA y móviles.`,
          examples: [
            {
              lang: 'php',
              code: `use App\\Http\\Resources\\ProductoResource;
Route::get('/productos', fn () => ProductoResource::collection(Producto::all()));`,
              caption: 'Resource de colección.',
            },
          ],
        },
        {
          id: 'laravel-auth',
          title: 'Autenticación',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Login y guards.',
          topics: ['Auth', 'guard', 'hash'],
          content:
            `Laravel incluye auth lista para usar con Breeze/Jetstream.\n\nLas contraseñas se hashean con Hash::make automáticamente.`,
          examples: [
            {
              lang: 'php',
              code: `use Illuminate\\Support\\Facades\\Hash;
use Illuminate\\Support\\Facades\\Auth;
public function login(Request $r) {
    if (Auth::attempt($r->only('email', 'password'))) {
        return redirect('/dashboard');
    }
    return back()->withErrors(['email' => 'Credenciales inválidas']);
}`,
              caption: 'Login con Auth.',
            },
          ],
        },
        {
          id: 'laravel-queue',
          title: 'Colas y jobs',
          level: 'avanzado',
          durationMin: 25,
          summary: 'Trabajo en segundo plano.',
          topics: ['Queue', 'Job', 'dispatch'],
          content:
            `Los Jobs aplazan tareas pesadas fuera del request.\n\n'php artisan queue:work' procesa la cola.`,
          examples: [
            {
              lang: 'php',
              code: `EnviarCorreo::dispatch($usuario); // se encola
// class EnviarCorreo implements ShouldQueue { public function handle() { /* ... */ } }`,
              caption: 'Despachar un job.',
            },
          ],
        },
      ],
    },
  ],
};
