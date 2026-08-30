import type { Framework } from '../types';

export const springboot: Framework = {
  id: 'springboot',
  name: 'Spring Boot',
  category: 'backend',
  icon: '🍃',
  color: '#6db33f',
  tagline: 'Framework empresarial de Java con convención sobre configuración.',
  description:
    'Spring Boot simplifica aplicaciones Java con autoconfiguración, servidor embebido y ecosistema enorme. Estándar para backends empresariales y microservicios.',
  modules: [
    {
      id: 'springboot-basico',
      title: 'Primeros pasos',
      level: 'basico',
      summary: 'Proyecto, dependencias y controlador.',
      lessons: [
        {
          id: 'springboot-setup',
          title: 'Setup del proyecto',
          level: 'basico',
          durationMin: 20,
          summary: 'Genera el proyecto con Spring Initializr.',
          topics: ['initializr', 'maven', 'dependencies'],
          content:
            `Usa start.spring.io para generar el esqueleto con Maven o Gradle.\n\nLa anotación @SpringBootApplication arranca todo.`,
          examples: [
            {
              lang: 'bash',
              code: `# Genera en start.spring.io y luego:
./mvnw spring-boot:run`,
              caption: 'Correr la app con Maven wrapper.',
            },
          ],
        },
        {
          id: 'springboot-controller',
          title: 'REST Controller',
          level: 'basico',
          durationMin: 25,
          summary: 'Expón endpoints con @RestController.',
          topics: ['RestController', 'GetMapping', 'json'],
          content:
            `Un controlador con @RestController devuelve JSON automáticamente.\n\n@RequestMapping define el prefijo de la ruta.`,
          examples: [
            {
              lang: 'java',
              code: `import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api")
public class SaludoController {
    @GetMapping("/saludo")
    public String saludo() {
        return "hola mundo";
    }
}`,
              caption: 'Controlador REST básico.',
            },
          ],
        },
        {
          id: 'springboot-path',
          title: 'Path y query params',
          level: 'basico',
          durationMin: 20,
          summary: 'Recibe parámetros tipados.',
          topics: ['PathVariable', 'RequestParam', 'tipos'],
          content:
            `Usa @PathVariable para la URL y @RequestParam para query.\n\nSpring convierte los tipos automáticamente.`,
          examples: [
            {
              lang: 'java',
              code: `@GetMapping("/items/{id}")
public String item(@PathVariable Long id, @RequestParam(defaultValue="10") int limite) {
    return "id=" + id + " limite=" + limite;
}`,
              caption: 'Path y query params.',
            },
          ],
        },
      ],
    },
    {
      id: 'springboot-intermedio',
      title: 'Datos y servicios',
      level: 'intermedio',
      summary: 'JPA, repositorios y servicios.',
      lessons: [
        {
          id: 'springboot-entity',
          title: 'Entidades JPA',
          level: 'intermedio',
          durationMin: 25,
          summary: 'Modela tablas con anotaciones.',
          topics: ['Entity', 'Id', 'Column'],
          content:
            `Las entidades se anotan con @Entity y @Id.\n\nJPA genera el esquema y las consultas por ti.`,
          examples: [
            {
              lang: 'java',
              code: `import jakarta.persistence.*;
@Entity
public class Producto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nombre;
    private Double precio;
}`,
              caption: 'Entidad JPA.',
            },
          ],
        },
        {
          id: 'springboot-repo',
          title: 'Spring Data Repository',
          level: 'intermedio',
          durationMin: 30,
          summary: 'CRUD sin escribir SQL.',
          topics: ['Repository', 'JpaRepository', 'query'],
          content:
            `Extiende JpaRepository para CRUD y paginación.\n\nMétodos como findByNombre se generan por nombre.`,
          examples: [
            {
              lang: 'java',
              code: `import org.springframework.data.jpa.repository.JpaRepository;
public interface ProductoRepo extends JpaRepository<Producto, Long> {
    java.util.List<Producto> findByPrecioLessThan(Double max);
}`,
              caption: 'Repositorio con query derivada.',
            },
          ],
        },
        {
          id: 'springboot-service',
          title: 'Capa de servicio',
          level: 'intermedio',
          durationMin: 30,
          summary: 'Lógica de negocio con @Service.',
          topics: ['Service', 'inyeccion', 'transaccional'],
          content:
            `Los servicios usan @Service e inyectan repositorios.\n\n@Transactional garantiza integridad en operaciones múltiples.`,
          examples: [
            {
              lang: 'java',
              code: `@Service
public class ProductoService {
    @Autowired private ProductoRepo repo;
    public Producto crear(Producto p) {
        return repo.save(p);
    }
}`,
              caption: 'Servicio con inyección.',
            },
          ],
        },
      ],
    },
    {
      id: 'springboot-avanzado',
      title: 'Patrones profesionales',
      level: 'avanzado',
      summary: 'Seguridad, validación y tests.',
      lessons: [
        {
          id: 'springboot-security',
          title: 'Spring Security',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Protege endpoints con JWT.',
          topics: ['Security', 'JWT', 'filtro'],
          content:
            `Spring Security configura reglas de acceso por ruta.\n\nCombínalo con un filtro JWT para autenticación stateless.`,
          examples: [
            {
              lang: 'java',
              code: `@Configuration
@EnableWebSecurity
public class Seguridad {
    protected void configure(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(a -> a.requestMatchers("/api/**").authenticated());
    }
}`,
              caption: 'Configuración de seguridad.',
            },
          ],
        },
        {
          id: 'springboot-validation',
          title: 'Validación',
          level: 'avanzado',
          durationMin: 25,
          summary: 'DTOs validados con anotaciones.',
          topics: ['Valid', 'NotNull', 'BindingResult'],
          content:
            `Usa @Valid en el body y anotaciones como @NotBlank.\n\nBindingResult captura los errores de validación.`,
          examples: [
            {
              lang: 'java',
              code: `public record CrearProducto(@NotBlank String nombre, @Positive Double precio) {}
@PostMapping("/productos")
public Producto crear(@Valid @RequestBody CrearProducto dto) {
    return service.crear(new Producto(dto.nombre(), dto.precio()));
}`,
              caption: 'DTO validado.',
            },
          ],
        },
        {
          id: 'springboot-test',
          title: 'Testing',
          level: 'avanzado',
          durationMin: 30,
          summary: 'Tests con MockMvc y @SpringBootTest.',
          topics: ['MockMvc', 'Test', 'assert'],
          content:
            `MockMvc simula peticiones HTTP sin levantar el puerto.\n\n@SpringBootTest arranca el contexto real para integración.`,
          examples: [
            {
              lang: 'java',
              code: `@SpringBootTest
@AutoConfigureMockMvc
class ApiTest {
    @Autowired MockMvc mvc;
    @Test void saludo() throws Exception {
        mvc.perform(get("/api/saludo")).andExpect(status().isOk());
    }
}`,
              caption: 'Test de controlador.',
            },
          ],
        },
      ],
    },
  ],
};
