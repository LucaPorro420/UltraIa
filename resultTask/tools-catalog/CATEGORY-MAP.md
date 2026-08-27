# Category mapping — UltraIa catalog → itsfree.dev

itsfree.dev uses 14 fixed category ids. Our `catalog.ts` uses 11. Mapping for
reference (used when shaping the export or a future submission):

| UltraIa category | itsfree.dev id | itsfree.es label |
|---|---|---|
| `ia-ml` | `ai` | IA y machine learning |
| `diseno-ui` | `design` | Diseño y UI |
| `video-audio` | `media`* | Storage y multimedia |
| `codigo-dev` | `ci` | CI/CD y código |
| `datos-backend` | `data` | Datos y backend |
| `seguridad` | `security` | Seguridad |
| `nube-infra` | `hosting` | Hosting y deploy |
| `automatizacion` | `api` | APIs y automatización |
| `contenido-cms` | `cms` | Contenido y CMS |
| `productividad-equipo` | `collaboration` | Equipo y productividad |
| `aprendizaje` | `ai`* (no exact match) | — |

\* `video-audio` is a stretch under `media` (which is really storage/delivery);
`ai` is the more honest fit for generative media. `aprendizaje` has no direct
itsfree.dev equivalent — fold into `ai` or `collaboration` by judgement.

## Why not 62 separate entries
- itsfree.dev entries require an **official external homepage** + **verified pricing/limits URL**.
- Our 62 capabilities are **internal app routes** (`/studio`, `/gallery`, `/cloud`…), not
  standalone products. Inventing 62 homepages/pricing pages would breach their
  editorial policy and be rejected.
- Correct path: list **UltraIa as one resource** (see `itsfree-dev-pr-draft.md`).
- The full 62-capability export (`itsfree-flat.json`, `itsfree-<lang>.md`) stays as
  **our own** catalog artifact, not a itsfree.dev submission.
