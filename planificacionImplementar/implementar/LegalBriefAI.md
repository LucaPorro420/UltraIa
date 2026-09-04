## Plan de Negocio: "LegalBrief AI" — SaaS de Resúmenes de Contratos y Documentos Legales con IA

### Resumen Ejecutivo

**LegalBrief AI** es una aplicación web SaaS que utiliza inteligencia artificial para analizar, resumir y extraer cláusulas clave de contratos y documentos legales. Está dirigida a pymes, autónomos, gestores y departamentos legales pequeños que no pueden permitirse un asesor jurídico para cada documento.

El modelo de negocio es por suscripción mensual con planes escalonados. Los costes operativos son bajos (principalmente APIs de IA como OpenAI o Claude), el margen bruto supera el 80% y la escalabilidad es alta al ser 100% digital. No requiere inversión inicial significativa: se puede desarrollar con herramientas gratuitas o de bajo coste y lanzar como producto mínimo viable en 3 meses.

La rentabilidad es segura porque resuelve un dolor real y recurrente (revisión de contratos) con un precio muy inferior al de un abogado (20-50 €/mes vs 100-300 €/hora). La salida o "exit" es viable mediante adquisición por empresas de legaltech, gestorías online o plataformas de firma electrónica (DocuSign, Signaturit, etc.) que buscan añadir valor de IA.

---

## 1. Problema y Oportunidad

### 1.1. Problema

- Las pymes y autónomos reciben contratos, acuerdos de confidencialidad, condiciones de servicio, etc., pero no tienen tiempo ni conocimientos para analizarlos en profundidad.
- Contratar un abogado para cada revisión es caro (100-300 €/hora) y lento.
- Los errores en cláusulas pueden provocar pérdidas económicas o legales.

### 1.2. Oportunidad

- El mercado de legaltech está creciendo un 15% anual.
- La IA generativa (GPT-4, Claude) permite resumir y extraer cláusulas con alta precisión.
- No existe una solución sencilla y asequible en español para este nicho concreto.

---

## 2. Solución: LegalBrief AI

**LegalBrief AI** ofrece:

- **Carga de documentos**: PDF, Word, imágenes (OCR).
- **Análisis automático**: Resumen ejecutivo en lenguaje claro, identificación de cláusulas clave (confidencialidad, penalizaciones, renovación automática, propiedad intelectual, etc.).
- **Alertas de riesgo**: Señala cláusulas abusivas o inusuales con explicación.
- **Comparador de versiones**: Detecta cambios entre dos versiones de un contrato.
- **Biblioteca de contratos**: Almacenamiento seguro y búsqueda semántica.
- **Integraciones**: Firma electrónica (Dropbox Sign, Signaturit), CRM (HubSpot), almacenamiento en la nube (Google Drive, Dropbox).
- **API para developers**: Permite integrar el análisis en otras herramientas.

---

## 3. Mercado Objetivo y Competencia

### 3.1. Segmentos de clientes

- **Autónomos y freelancers** (España, Latam): necesitan revisar contratos con clientes/proveedores.
- **Pymes (1-50 empleados)**: sin departamento legal, manejan contratos comerciales.
- **Gestorías y asesorías**: pueden usar la herramienta para dar servicio a sus clientes.
- **Departamentos legales pequeños**: para triaje inicial de documentos.

### 3.2. Tamaño de mercado

- En España hay más de 3 millones de autónomos y 2,9 millones de pymes.
- En Latinoamérica hay más de 30 millones de pymes.
- Si solo el 1% de ese mercado paga 30 €/mes, son ingresos potenciales de 10+ millones €/mes.

### 3.3. Competencia

- **Herramientas generales**: ChatGPT, Claude (pero no especializadas ni con flujo guiado).
- **Legaltech internacional**: LawGeex, Kira Systems (enfocadas a grandes empresas, caras).
- **Plataformas de firma electrónica**: DocuSign, Signaturit (tienen análisis básico, pero no profundo).
- **Bufetes online**: ofrecen revisión manual, más cara y lenta.

**Ventaja competitiva**: Especialización en español, interfaz sencilla, precio bajo, integración con flujo de trabajo existente.

---

## 4. Producto y Tecnología

### 4.1. Funcionalidades MVP (versión inicial)

1. Registro/login con email o Google.
2. Subida de PDF o Word (máx. 20 páginas).
3. Procesamiento con IA:
   - Resumen de 1 párrafo.
   - Lista de cláusulas importantes detectadas.
   - Alertas de riesgo (configurables).
4. Historial de documentos analizados.
5. Exportar resumen a PDF o Markdown.
6. Plan gratuito limitado (3 documentos/mes) y plan de pago ilimitado.

### 4.2. Stack tecnológico

- **Frontend**: React/Next.js (alojado en Vercel/Netlify).
- **Backend**: Node.js (NestJS) o Python (FastAPI) en Render/Railway.
- **Base de datos**: PostgreSQL (Supabase) para usuarios y metadatos; almacenamiento de archivos en S3/Cloudflare R2.
- **IA**: OpenAI API (GPT-4o mini para reducir costes) o Anthropic Claude (Haiku/Sonnet) mediante un wrapper tipo ModelMesh (se puede reutilizar del proyecto anterior si ya existe).
- **OCR**: Tesseract o API de Google Vision para documentos escaneados.
- **Automatización**: n8n para flujos internos (facturación, emails, backups).
- **Pagos**: Stripe (suscripciones y facturación).
- **Analítica**: Plausible o Matomo (privacidad).

### 4.3. Costes operativos estimados (mensuales, MVP)

- Hosting frontend/backend: 20-50 €/mes.
- Base de datos: 10-30 €/mes.
- Almacenamiento: 5-20 €/mes.
- APIs de IA: variable según uso; con 100 usuarios de pago, ~100-300 €/mes.
- Stripe: ~2,9% + 0,25 € por transacción.
- **Total fijo**: 100-400 €/mes (sin contar tiempo de desarrollo propio).

---

## 5. Modelo de Negocio y Precios

### 5.1. Planes de suscripción

| Plan           | Precio mensual | Características                                                                      |
| -------------- | -------------- | ------------------------------------------------------------------------------------ |
| **Free**       | 0 €            | 3 análisis/mes, 5 páginas máx., marca de agua.                                       |
| **Pro**        | 29 €/mes       | Análisis ilimitados, 50 páginas, alertas avanzadas, historial completo, exportación. |
| **Business**   | 99 €/mes       | 5 usuarios, API básica, comparador de versiones, integraciones (Drive, Slack).       |
| **Enterprise** | Personalizado  | API completa, SSO, SLA, modelos personalizados, soporte dedicado.                    |

### 5.2. Ingresos recurrentes mensuales (MRR) objetivo

- Mes 1-3: 0 € (desarrollo)
- Mes 4-6: 500-1.000 € (primeros 20-30 clientes)
- Mes 7-12: 3.000-5.000 € (100-150 clientes)
- Año 2: 15.000-30.000 €/mes (500-1.000 clientes)

### 5.3. Margen bruto

- Coste por análisis con IA: ~0,02-0,10 € (dependiendo del tamaño).
- Precio por análisis incluido en plan: ~1-3 € (si se prorratea).
- Margen > 90% en costes directos.

---

## 6. Estrategia de Go-to-Market

1. **Lanzamiento en comunidades de autónomos y pymes** (foros, grupos de Facebook/LinkedIn, asociaciones).
2. **Marketing de contenidos**: blog con guías "cómo revisar un contrato de arrendamiento", "cláusulas abusivas más comunes", etc. SEO para captar tráfico orgánico.
3. **Freemium**: plan gratuito que demuestra valor y convierte a pago.
4. **Alianzas con gestorías y asesorías**: ofrecer licencias con descuento para que lo usen con sus clientes.
5. **Publicidad segmentada**: Google Ads con palabras clave long tail ("revisar contrato online", "resumen de contrato con IA").
6. **Programa de referidos**: descuento de un mes por cada nuevo cliente referido.
7. **Webinars y talleres**: educar sobre riesgos legales y demostrar la herramienta.

---

## 7. Rentabilidad y Proyección Financiera

### 7.1. Costes iniciales (inversión propia)

- Dominio y hosting: 50 €/año.
- Herramientas de desarrollo (VS Code, GitHub, etc.): gratuitas.
- APIs de IA para pruebas: 50-100 €.
- Diseño de logo y web: 0-200 € (usar plantillas).
- **Total inicial**: < 500 €. **No se necesita inversión externa**.

### 7.2. Punto de equilibrio

Con 20 clientes del plan Pro (29 €) se cubren los costes fijos mensuales (~400 €). Eso se puede alcanzar en el primer trimestre con una mínima campaña.

### 7.3. Proyección a 3 años (escenario conservador)

- Año 1: 100 clientes promedio, MRR 3.000 €, ingresos anuales 36.000 €, beneficio ~25.000 €.
- Año 2: 500 clientes, MRR 15.000 €, ingresos 180.000 €, beneficio ~140.000 €.
- Año 3: 1.500 clientes, MRR 45.000 €, ingresos 540.000 €, beneficio ~450.000 €.

---

## 8. Estrategia de Salida (Exit)

### 8.1. Posibles compradores

- **Empresas de firma electrónica** (DocuSign, Signaturit, HelloSign): quieren añadir análisis de documentos a su oferta.
- **Gestorías online** (Declarando, Billin, Holded): buscan ampliar servicios para autónomos.
- **Plataformas de legaltech** (Lexly, LegalZoom España): quieren incorporar IA de resúmenes.
- **Fondos de inversión en SaaS**: adquisición para integrar en un portfolio más grande.

### 8.2. Valoración típica de SaaS

Se valora en 3-5 veces el ARR (ingresos recurrentes anuales). Con un ARR de 180.000 € (año 2), la valoración sería 540.000-900.000 €. Con crecimiento demostrado y baja rotación, se puede superar.

### 8.3. Preparación para la venta

- Mantener métricas limpias (MRR, churn, LTV, CAC).
- Documentar el código y la infraestructura.
- Tener contratos de propiedad intelectual claros.
- No depender de un solo proveedor de IA (usar múltiples APIs).
- Crear una marca reconocida en el nicho.

---

## 9. Riesgos y Mitigación

| Riesgo                                               | Probabilidad | Impacto | Mitigación                                                                                            |
| ---------------------------------------------------- | ------------ | ------- | ----------------------------------------------------------------------------------------------------- |
| Cambios en APIs de IA (precios, restricciones)       | Alta         | Medio   | Usar wrapper propio que permita cambiar de proveedor; cachear respuestas.                             |
| Competencia grande (OpenAI lanza función similar)    | Media        | Alto    | Diferenciarse con flujo guiado, plantillas legales en español, integraciones específicas.             |
| Baja adopción                                        | Media        | Alto    | Freemium agresivo, marketing de contenidos, alianzas con gestorías.                                   |
| Problemas legales (responsabilidad por mal análisis) | Media        | Alto    | Incluir disclaimer claro, no dar asesoramiento legal, recomendar revisión humana para casos críticos. |
| Costes de API descontrolados                         | Media        | Medio   | Límites por plan, compresión de documentos, usar modelos más baratos para tareas simples.             |

---

## 10. Plan de Implementación (12 semanas)

### Semanas 1-2: Definición y prototipo

- Especificar funcionalidades MVP.
- Crear mockups de la interfaz.
- Configurar repositorio y entorno de desarrollo.
- Probar APIs de IA con documentos de ejemplo.

### Semanas 3-5: Desarrollo del MVP

- Backend: autenticación, subida de archivos, integración con IA, base de datos.
- Frontend: páginas de registro, dashboard, visor de resultados.
- Implementar plan gratuito y de pago con Stripe (modo test).

### Semanas 6-7: Pruebas y ajustes

- Pruebas con usuarios beta (10-15 personas).
- Ajustar prompts para mejorar precisión.
- Optimizar costes y velocidad.
- Añadir analítica básica.

### Semanas 8-9: Lanzamiento privado

- Invitar a lista de espera (crear landing page desde el inicio).
- Recoger feedback y corregir errores.
- Preparar materiales de marketing (blog, videos cortos).

### Semanas 10-12: Lanzamiento público

- Publicar en Product Hunt, Hacker News, comunidades.
- Campaña de contenidos SEO.
- Iniciar alianzas con gestorías.
- Monitorear métricas y ajustar precios.

---

## 11. Conclusión

**LegalBrief AI** es un negocio digital con:

- **Inversión inicial mínima** (< 500 €) y sin necesidad de capital externo.
- **Rentabilidad segura** gracias a márgenes superiores al 80% y un dolor de mercado real.
- **Escalabilidad** global (cualquier hispanohablante puede usarlo).
- **Salida clara** mediante adquisición por actores del sector legaltech/fintech.
- **Riesgo controlado** al no requerir infraestructura física ni empleados iniciales.

Es un proyecto realista, implementable por una sola persona con conocimientos de desarrollo web y APIs de IA, y con potencial de convertirse en un activo vendible en 2-3 años.
