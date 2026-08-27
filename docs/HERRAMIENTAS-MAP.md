# Mapa de Herramientas UltraIa (HERRAMIENTAS-MAP)

Catalogo de **62 capacidades** integradas en el hub `/herramientas` (requiere login) y
exportables a `itsfree.dev` en 14 idiomas (prioridad: es/en/pt/it/de/zh/ru).

Generado desde `packages/core/src/tools/catalog.ts` (fuente de verdad).

## Resumen por categoria

| Categoria | Capacidades |
|---|---|
| IA / ML | 5 |
| Diseno UI | 3 |
| Video / Audio | 13 |
| Codigo / Dev | 13 |
| Datos / Backend | 3 |
| Seguridad | 3 |
| Nube / Infra | 2 |
| Automatizacion | 3 |
| Contenido / CMS | 6 |
| Aprendizaje | 9 |
| Productividad / Equipo | 2 |
| **Total** | **62** |

## Catalogo completo

### IA / ML

#### G0DM0D3  (`g0dm0d3`)
- Ruta: `/studio`
- Оценка и тесты в стиле G0DM0D3: возмущение входа, адаптивная выборка и многоугольная оценка.
- Relacionadas: `skills`

#### Веб  (`web`)
- Ruta: `/studio`
- Читает текст и метаданные публичной страницы (веб или публичный соцпост). Без ключей.
- Relacionadas: `reach`

#### Веб-охват  (`reach`)
- Ruta: `/studio`
- Доступ в интернет в реальном времени: читает страницы, ищет, ищет на GitHub, парсит RSS и метаданные YouTube.
- Relacionadas: `web`

#### Изображение  (`image`)
- Ruta: `/gallery`
- Генерирует фотореалистичное изображение из текста бесплатной моделью без ключей. Возвращает URL.
- Relacionadas: `video`, `design`, `pngrender`

#### Навыки  (`skills`)
- Ruta: `/dashboard`
- Выполняет шаг конвейера разработки агентов: plan, build, test, review, ship, simplify.
- Relacionadas: `g0dm0d3`, `genesis`

### Diseno UI

#### Design Compose  (`designcompose`)
- Ruta: `/studio`
- Детерминированная и безключевая 2D- или 3D-композиция из математики.
- Relacionadas: `design`, `geometry`, `pngrender`

#### UI-дизайн  (`design`)
- Ruta: `/studio`
- Генерирует экран UI высокой точности из текста с помощью Google Stitch (Google Labs бесплатно).
- Relacionadas: `designcompose`, `image`, `video`

#### Диаграммы  (`diagram`)
- Ruta: `/studio`
- Автономные редакционные диаграммы (таймлайн, поток данных, архитектура, цикл) в стиле Dark Obsidian.
- Relacionadas: `design`, `studio`

### Video / Audio

#### CodeVFX  (`codevfx`)
- Ruta: `/studio`
- Визуальные эффекты на 100 процентов кодом (без ассетов): огонь, лёд, молния, с GLSL и физикой.
- Relacionadas: `vfx`, `designcompose`, `generative`

#### Procedural Video  (`procvid`)
- Ruta: `/studio`
- Детерминированное процедурное видео: анимации и сборка ffmpeg или GIF.
- Relacionadas: `pngrender`, `generative`, `physics2d`

#### Recordly  (`recordly`)
- Ruta: `/studio`
- Планировщик ScreenFlow Studio: авто-зум, пресеты курсора, пузырь веб-камеры и экспорт MP4.
- Relacionadas: `screenflow`, `video_edit`

#### ScreenFlow  (`screenflow`)
- Ruta: `/studio`
- Автоматизация записи экрана: план, захват, монтаж и локальная публикация.
- Relacionadas: `video_edit`, `video`, `studio`

#### Studio  (`studio`)
- Ruta: `/studio`
- Медиа-хаб: сохраняет, воспроизводит и порождает сгенерированные ассеты.
- Relacionadas: `video`, `image`, `music`, `content`

#### VFX  (`vfx`)
- Ruta: `/studio`
- Планировщик постпродакшена (reframe, upscale, LUT, ротоскопия, B-roll), детерминированный.
- Relacionadas: `codevfx`, `video_edit`, `video`

#### Видео  (`video`)
- Ruta: `/studio`
- Создаёт раскадровку видео (последовательность кадров) из текста. Без ключей; настоящее видео при наличии провайдера.
- Relacionadas: `image`, `music`, `design`, `video_edit`

#### Видео путешествий  (`travel`)
- Ruta: `/studio`
- Движок видео путешествий: план 9:16 из пункта назначения с двуязычным закадровым и рендером ffmpeg.
- Relacionadas: `video`, `image`, `generative`

#### Генеративное  (`generative`)
- Ruta: `/studio`
- Процедурный медиа-движок на 100 процентов кодом: изображения, видео и аудио из математики.
- Relacionadas: `pngrender`, `procvid`, `physics2d`, `creativo`, `sdf`

#### Контент-ресурсы  (`content`)
- Ruta: `/studio`
- Бесплатные ассеты для видео и аудио: музыка и эффекты (Tunetank) и сток (mixkit).
- Relacionadas: `music`, `video`, `studio`

#### Креатив  (`creativo`)
- Ruta: `/studio`
- Творческий физический движок на 100 процентов кодом: 2D-частицы, звук и холст.
- Relacionadas: `physics2d`, `generative`

#### Монтаж видео  (`video_edit`)
- Ruta: `/studio`
- Конвейер монтажа: транскрипция, EDL, рендер ffmpeg и детерминированная самооценка.
- Relacionadas: `video`, `screenflow`, `vfx`, `motion`

#### Музыка  (`music`)
- Ruta: `/studio`
- Сочиняет оригинальное музыкальное произведение из текста. Без ключей; настоящее аудио при наличии провайдера.
- Relacionadas: `video`, `content`, `studio`

### Codigo / Dev

#### 2D-физика  (`physics2d`)
- Ruta: `/studio`
- Детерминированная 2D-физика (Верле и твёрдые тела) с холстом.
- Relacionadas: `creativo`, `generative`, `procvid`

#### CAD Geometry  (`cadgeo`)
- Ruta: `/studio`
- Набор вычислительной геометрии: Delaunay, Voronoi, BVH, B-сплайн.
- Relacionadas: `geometry`, `geom`, `pngrender`
- Consolida: `geometry`

#### Imaging  (`imaging`)
- Ruta: `/studio`
- Ядра обработки изображений на чистом TypeScript: фильтры, края, оптический поток.
- Relacionadas: `videoqa`, `motion`, `pngrender`

#### Motion  (`motion`)
- Ruta: `/studio`
- Анализ движения видео: поле оптического потока и разложение камеры или сцены.
- Relacionadas: `videoqa`, `imaging`, `video_edit`

#### PNG Render  (`pngrender`)
- Ruta: `/studio`
- PNG-рендерер на чистом TypeScript: изображения из математических функций.
- Relacionadas: `geometry`, `procvid`, `generative`

#### Replica  (`replica`)
- Ruta: `/studio`
- Оркестратор анализ-через-синтез: воспроизводит цель, генерируя её и сравнивая.
- Relacionadas: `videoqa`, `motion`, `generative`

#### SDF  (`sdf`)
- Ruta: `/studio`
- Подписанные поля расстояний и рей-марчинг на 100 процентов кодом: 3D-сцены и GLSL.
- Relacionadas: `geometry`, `geom`, `pngrender`

#### VideoQA  (`videoqa`)
- Ruta: `/studio`
- Метрики качества видео: PSNR, SSIM, оптический поток и вердикт PASS или FAIL.
- Relacionadas: `imaging`, `motion`

#### Геометрия  (`geom`)
- Ruta: `/studio`
- Библиотека геометрии и математики: векторы, матрицы, сетки и SVG.
- Relacionadas: `geometry`, `cadgeo`, `pngrender`, `sdf`

#### Калькулятор  (`calculator`)
- Ruta: `/studio`
- Безопасно вычисляет математическое выражение (только математика).

#### Параметрическая геометрия  (`geometry`)
- Ruta: `/studio`
- Процедурная геометрия (суперформула Гилиса): сетки и экспорт glTF или OBJ.
- Relacionadas: `geom`, `cadgeo`, `pngrender`, `sdf`
- Consolida: `geom`

#### Эволюционный  (`evo`)
- Ruta: `/studio`
- Детерминированный воспроизводимый генетический алгоритм (xorshift32).
- Relacionadas: `evolution`, `generative`

#### Эволюция  (`evolution`)
- Ruta: `/studio`
- Движок эволюции артефактов с постоянной памятью.
- Relacionadas: `evo`, `generative`

### Datos / Backend

#### Knowledge Graph  (`kgraph`)
- Ruta: `/dashboard`
- Конструктор графа знаний из кода и документов.
- Relacionadas: `brainpage`, `vault`, `research`

#### Память  (`memory`)
- Ruta: `/dashboard`
- Система архива памяти агента: помнит и читает то, что пользователь рассказывает между сессиями.
- Relacionadas: `semantic_memory`, `qdrant_memory`, `brainpage`, `autolearn`

#### Хранилище  (`vault`)
- Ruta: `/cloud`
- Собственный репозиторий: сохраняет данные, файлы, творения и доказательства проекта.
- Relacionadas: `cloud`, `kgraph`, `pdfsearch`

### Seguridad

#### Безопасность  (`security`)
- Ruta: `/dashboard`
- Сканер секретов и рисковых конфигураций в тексте или репозитории.
- Relacionadas: `codequality`, `deps`
- Consolida: `codequality`, `deps`

#### Зависимости  (`deps`)
- Ruta: `/dashboard`
- Аудит уязвимостей (SCA) с помощью npm audit.
- Relacionadas: `security`, `codequality`
- Consolida: `security`, `codequality`

#### Качество кода  (`codequality`)
- Ruta: `/dashboard`
- Линтер частых code smells: debugger, eval, any, console.log.
- Relacionadas: `security`, `deps`
- Consolida: `security`, `deps`

### Nube / Infra

#### NetWatch  (`netwatch`)
- Ruta: `/dashboard`
- Сторож сети WiFi: мониторит и переподключает соединение.
- Relacionadas: `cerebro`

#### Облако  (`cloud`)
- Ruta: `/cloud`
- Облачное хранилище проекта: локально или Cloudflare R2, с проверкой путей и размеров.
- Relacionadas: `vault`, `netwatch`

### Automatizacion

#### AutoPub  (`autopub`)
- Ruta: `/dashboard`
- Автономная фабрика контента: выполняет цикл F1-F4 автономно.
- Relacionadas: `publications`, `present`, `contenido`, `topics`, `cerebro`

#### Genesis  (`genesis`)
- Ruta: `/dashboard`
- Автономный инженерный движок: валидирует манифест и выбирает следующее действие.
- Relacionadas: `cerebro`, `autolearn`, `harness`

#### Harness  (`harness`)
- Ruta: `/dashboard`
- Плагин-рантайм для агентов: запускает, выполняет и останавливает детерминированное дерево плагинов.
- Relacionadas: `genesis`, `cerebro`

### Contenido / CMS

#### Контент  (`contenido`)
- Ruta: `/dashboard`
- Маршрутизатор контента (AutoPub F2): от брифа к посту или раскадровке видео с manifest.json.
- Relacionadas: `present`, `publications`, `topics`, `autopub`

#### Метрики  (`metrics`)
- Ruta: `/metrics`
- KPI по каналам и сигналы обратной связи для замыкания цикла контента.
- Relacionadas: `publications`, `autopub`, `growth`

#### Опубликовать  (`publish`)
- Ruta: `/dashboard`
- Адаптеры распространения (AutoPub F4): YouTube, TikTok, X, Meta, Telegram, Discord, Slack, LinkedIn.
- Relacionadas: `publications`, `autopub`

#### Очередь публикаций  (`publications`)
- Ruta: `/dashboard`
- Управление очередью публикаций (AutoPub F4): создать, одобрить, отклонить и опубликовать запланированное.
- Relacionadas: `autopub`, `present`, `contenido`, `metrics`

#### Презентация  (`present`)
- Ruta: `/dashboard`
- Конструктор публикаций (AutoPub F3): пакет по каналу с подписями, хештегами, визуалом и расписанием.
- Relacionadas: `publications`, `contenido`, `autopub`

#### Темы  (`topics`)
- Ruta: `/dashboard`
- Движок идей контента (AutoPub F1): приоритетные брифы из RSS и DuckDuckGo.
- Relacionadas: `contenido`, `autopub`, `metrics`

### Aprendizaje

#### BrainPage  (`brainpage`)
- Ruta: `/dashboard`
- Постоянная Markdown-память с временной шкалой доказательств.
- Relacionadas: `memory`, `semantic_memory`, `kgraph`

#### PDF Search  (`pdfsearch`)
- Ruta: `/dashboard`
- Поиск PDF: OpenAlex и DuckDuckGo filetype:pdf переносятся в хранилище.
- Relacionadas: `enlaces`, `research`, `vault`

#### Автообучение  (`autolearn`)
- Ruta: `/dashboard`
- Агент автопрограммирования: находит пробелы и генерирует план улучшения.
- Relacionadas: `learnModels`, `genesis`, `kgraph`

#### Исследование  (`research`)
- Ruta: `/studio`
- Поисковый движок: arXiv, GitHub, живой веб и извлечение URL как текста.
- Relacionadas: `pdfsearch`, `enlaces`, `kgraph`

#### Книги  (`libros`)
- Ruta: `/ebooks`
- Каталог из 115 бесплатных книг и учебников по программированию на испанском.
- Relacionadas: `enlaces`, `pdfsearch`

#### Модели обучения  (`learnModels`)
- Ruta: `/dashboard`
- Программируемое обучение: мысли, сжатие памяти и метарассуждение.
- Relacionadas: `autolearn`, `semantic_memory`

#### Память Qdrant  (`qdrant_memory`)
- Ruta: `/dashboard`
- Внешняя постоянная память в Qdrant для корпуса проверенной истины.
- Relacionadas: `semantic_memory`, `memory`, `brainpage`

#### Семантическая память  (`semantic_memory`)
- Ruta: `/dashboard`
- Семантический поиск по проверенным знаниям с хешированием и косинусом.
- Relacionadas: `memory`, `qdrant_memory`, `brainpage`

#### Ссылки  (`enlaces`)
- Ruta: `/dashboard`
- Курация ссылок: загружает и вовлекает общие источники проекта.
- Relacionadas: `pdfsearch`, `research`, `libros`

### Productividad / Equipo

#### Cerebro  (`cerebro`)
- Ruta: `/dashboard`
- Автономный мозг UltraIa: учится, создаёт, публикует и отчитывается в плановом цикле.
- Relacionadas: `autopub`, `genesis`, `growth`

#### Рост  (`growth`)
- Ruta: `/dashboard`
- Движок роста канала: профиль, A/B-эксперименты и плейбук, накапливающий победы.
- Relacionadas: `metrics`, `cerebro`, `autopub`

## Analisis de solapamiento y propuestas de consolidacion

Varios grupos de capacidades cubren dominios adyacentes y podrian agruparse
en agentes/blueprints unicos para reducir fragmentacion:

### Geometria / CAD
- Capacidades: `geometry`, `cadgeo`, `geom`
- Recomendacion: Unificar en un paquete `geometry` con sub-modos (superficie, malla, CAD). `geom` y `cadgeo` ya declaran consolidar hacia `geometry`.

### Video / Edicion / Captura
- Capacidades: `video_edit`, `screenflow`, `recordly`
- Recomendacion: `screenflow` (captura+edicion) y `recordly` (planner de grabacion) se apoyan en `video_edit`. Exponer como un solo hub Video con tabs.

### Nube / Vault
- Capacidades: `cloud`, `vault`
- Recomendacion: `vault` es el repositorio local/propio; `cloud` es el almacenamiento externo (R2/local). Vincular: `cloud` sube los paquetes que `vault` prepara.

### Contenido / Presentacion / Publicacion
- Capacidades: `contenido`, `present`, `publications`, `autopub`
- Recomendacion: `present` empaqueta; `contenido` redacta/guioniza; `publications`/`autopub` distribuyen. Encadenar: contenido -> present -> publications -> autopub.

### Crecimiento / Metrics
- Capacidades: `growth`, `metrics`
- Recomendacion: `growth` (experimentos/playbook) consume las senales de `metrics` (KPIs por canal). Unificar bajo Analiticas.

### Busqueda / Investigacion
- Capacidades: `reach`, `research`, `pdfsearch`, `enlaces`
- Recomendacion: `research` orquesta fuentes (incl. `pdfsearch`); `reach` es lectura web; `enlaces` gestiona fuentes. Unificar en Investigacion.

### IA / Skills / Autolearn / Genesis
- Capacidades: `skills`, `autolearn`, `genesis`, `cerebro`
- Recomendacion: Skills de pipeline + autolearn (mode_plan) + genesis (orquestacion) + cerebro (autonomia). Agrupar en Agente.

### Memoria
- Capacidades: `memory`, `semantic_memory`, `qdrant_memory`, `brainpage`
- Recomendacion: Tres capas de memoria (working/semantic/qdrant) + brainpage. Unificar en un subsistema de memoria.

### Seguridad / Calidad
- Capacidades: `security`, `codequality`, `deps`
- Recomendacion: `security`, `codequality` y `deps` ya se declaran como consolidate cruzado. Mantener como un solo hub Seguridad.

## Export itsfree.dev

- `scripts/export-tools-catalog.mjs` genera el JSON para `itsfree.dev` (14 idiomas) consumiendo `/api/tools?lang=`.
- `scripts/analyze-tool-overlap.mjs` produce este mapa de solapamientos contra la API.
- Idiomas priorizados con traduccion completa: `es, en, pt, it, de, zh, ru`.
- Los 7 restantes (`fr, ar, hi, ja, nl, tr, ko`) hacen fallback a `es/en`.

## Como extender

1. Anadir la entrada en `CATALOG_META` (`packages/core/src/tools/catalog.ts`).
2. Anadir la traduccion `es` en el mapa `ES` (obligatoria).
3. Opcional: `en/pt/it/de/zh/ru` en sus mapas.
4. `getToolCatalog(locale)` ya la expone via `/api/tools` y el hub `/herramientas`.
