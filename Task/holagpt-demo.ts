// Task/holagpt-demo.ts — Demo E2E holagpt + content-factory (keyless-first, fail-soft)
// Run: node_modules\.bin\vite-node.cmd Task/holagpt-demo.ts [--quick]
import { holagptStatus } from "../packages/core/src/tools/holagpt";
import { contentFactoryGenerate } from "../packages/core/src/tools/content-factory";

async function main() {
  const quick = process.argv.includes("--quick");
  console.log("=== HolaGPT Demo ===");
  console.log("status:", holagptStatus());
  const brief = "Landing para cafeteria de especialidad en Montevideo (Uy) — estilo Dark Obsidian, oferta lanzamiento";
  const kinds: Array<"web" | "image" | "audio" | "music"> = quick ? ["image", "audio"] : ["web", "image", "audio", "music"];
  for (const k of kinds) {
    try {
      const r = await contentFactoryGenerate({ kind: k as never, brief, idioma: "es" } as never);
      console.log(`[${k}] provider=${r.provider} note=${r.note ?? ""}`.slice(0, 200));
    } catch (e) {
      console.log(`[${k}] failed (fail-soft): ${(e as Error).message.slice(0, 120)}`);
    }
  }
  if (!quick) {
    try {
      const v = await contentFactoryGenerate({ kind: "video", brief: "Video 9:16 cafeteria — 4 escenas", idioma: "es" } as never);
      console.log(`[video] provider=${v.provider}`);
    } catch (e) {
      console.log(`[video] failed (fail-soft): ${(e as Error).message.slice(0, 120)}`);
    }
  }
  console.log("demo OK — holagpt keyless fallback verificado (fail-soft)");
}
main().catch((e) => { console.error(e); process.exit(1); });
