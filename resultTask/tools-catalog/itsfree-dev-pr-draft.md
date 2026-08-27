# itsfree.dev — PR draft (single resource: UltraIa)

itsfree.dev (`github.com/midudev/itsfree.dev`) is a *curated* directory of
**external, standalone free products** (each entry needs an official `url`,
a verified `pricingUrl`, a `freeTier` text in EN+ES, and an `accessRequirement`).

Our 62 capabilities are **features inside UltraIa** (app routes like `/studio`,
`/gallery`, `/cloud`), not independent products with their own homepages. Listing
them as 62 separate directory entries would mean inventing URLs/pricing pages and
would be rejected on editorial review. The correct submission is **UltraIa once**,
as the product.

The export `itsfree-flat.json` (14 langs, 62 capabilities) remains valid as
*our own* catalog/data file — it is just not shaped for their directory.

## How to apply (fork midudev/itsfree.dev, then edit)

### 1) `src/data/resources.ts` — add to `resourceCatalog` (under `// AI`)
```ts
  // AI & machine learning
  { name: "UltraIa", url: "https://github.com/LucaPorro420/UltraIa", category: "ai", tags: ["ai", "agents", "multimodal", "no-code", "open-source"], description: { en: "An open AI studio that turns ideas into apps, media and content with keyless providers (image, video, audio, code) and a no-code builder.", es: "Un estudio de IA open source que convierte ideas en apps, medios y contenido con proveedores sin clave (imagen, vídeo, audio, código) y un builder no-code." } },
```

### 2) `src/data/resources.ts` — add to `pricingUrls` (mandatory; the build throws if missing)
```ts
  "UltraIa": "https://github.com/LucaPorro420/UltraIa#readme",
```

### 3) `src/data/free-tiers.ts` — add to `freeTiers`
```ts
  "UltraIa": { en: "Free to use: keyless AI providers (Pollinations, edge-tts, Tunetank) included, self-hostable, no credit card. External provider rate limits may apply.", es: "Gratis: proveedores de IA sin clave (Pollinations, edge-tts, Tunetank) incluidos, autoalojable, sin tarjeta. Pueden aplicarse límites de los proveedores externos." },
```

### 4) `src/data/free-tiers.ts` — add to `accessRequirements` (optional, defaults to `no-card`)
```ts
  "UltraIa": "no-card",
```

> **Placeholders to replace before opening the PR** (editorial requirement):
> - `url` → the **deployed** public URL of UltraIa (e.g. `https://ultraia.app`),
>   not the GitHub repo, once it is live.
> - `pricingUrl` → a real limits/pricing page (deploy a `/pricing` or point to
>   `DEPLOY.md`/`CLOUD-FREE-2026.md` on the site).
> - Verify the free-tier text against the live product before submitting.

Run `pnpm check && pnpm build` in their repo; both must pass.
