[autopub] inicio 2026-09-04T13:03:22.233Z (DRY-RUN: no escribe cola)
[autopub] config: max=2 idioma=es tts=false publishDue=false canales=youtube_shorts,tiktok,instagram,blog,telegram,discord,slack,facebook
[autopub] plan F1: descubrir temas (red keyless, sin guardar)
[autopub] plan F2-F4: generar contenido y encolar en modo DRY (sin escribir cola ni disco)
prisma:error 
Invalid `db.topicBrief.findMany()` invocation in
/home/runner/work/UltraIa/UltraIa/packages/core/src/domain/briefs.ts:74:37

  71 /** Cola de briefs ordenada por score desc. */
  72 export async function listarBriefs(db: Db, opts: ListBriefsOptions = {}): Promise<{ items: BriefRow[]; nextCursor: string | null }> {
  73   const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
→ 74   const items = await db.topicBrief.findMany(
The table `main.TopicBrief` does not exist in the current database.
[autopub] reporte: /home/runner/work/UltraIa/UltraIa/.ultraia/autopub/ciclo-2026-09-04T13-03-32-790Z.md
# AutoPub ciclo 2026-09-04T13:03:32.790Z

- Estado: CON ERRORES · briefs nuevos 0 (dup 0, descubiertos 12)
- Procesados: 0 · APPROVED auto: 0 · DRAFT humano: 0

## Errores

- cola: 
Invalid `db.topicBrief.findMany()` invocation in
/home/runner/work/UltraIa/UltraIa/packages/core/src/domain/briefs.ts:74:37

  71 /** Cola de briefs ordenada por score desc. */
  72 export async function listarBriefs(db: Db, opts: ListBriefsOptions = {}): Promise<{ items: BriefRow[]; nextCursor: string | null }> {
  73   const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
→ 74   const items = await db.topicBrief.findMany(
The table `main.TopicBrief` does not exist in the current database.
[autopub] fin ok=false procesados=0 errores=1
