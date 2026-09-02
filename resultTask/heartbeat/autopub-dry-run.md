[autopub] inicio 2026-09-02T13:07:27.283Z (DRY-RUN: no escribe cola)
[autopub] config: max=2 idioma=es tts=false publishDue=false canales=youtube_shorts,tiktok,instagram,blog,telegram,discord,slack,facebook
[autopub] plan F1: descubrir temas (red keyless, sin guardar)
[autopub] plan F2-F4: generar contenido y encolar en modo DRY (sin escribir cola ni disco)
prisma:error 
Invalid `db.topicBrief.findMany()` invocation in
/home/runner/work/UltraIa/UltraIa/packages/core/src/domain/briefs.ts:73:37

  70 /** Cola de briefs ordenada por score desc. */
  71 export async function listarBriefs(db: Db, opts: ListBriefsOptions = {}): Promise<{ items: BriefRow[]; nextCursor: string | null }> {
  72   const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
→ 73   const items = await db.topicBrief.findMany(
The table `main.TopicBrief` does not exist in the current database.
[autopub] reporte: /home/runner/work/UltraIa/UltraIa/.ultraia/autopub/ciclo-2026-09-02T13-07-28-968Z.md
# AutoPub ciclo 2026-09-02T13:07:28.968Z

- Estado: CON ERRORES · briefs nuevos 0 (dup 0, descubiertos 12)
- Procesados: 0 · APPROVED auto: 0 · DRAFT humano: 0

## Errores

- cola: 
Invalid `db.topicBrief.findMany()` invocation in
/home/runner/work/UltraIa/UltraIa/packages/core/src/domain/briefs.ts:73:37

  70 /** Cola de briefs ordenada por score desc. */
  71 export async function listarBriefs(db: Db, opts: ListBriefsOptions = {}): Promise<{ items: BriefRow[]; nextCursor: string | null }> {
  72   const take = Math.min(Math.max(opts.take ?? 20, 1), 100);
→ 73   const items = await db.topicBrief.findMany(
The table `main.TopicBrief` does not exist in the current database.
[autopub] fin ok=false procesados=0 errores=1
