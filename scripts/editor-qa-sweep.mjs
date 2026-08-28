// Barrido QA headless del Editor Visual (Part A de loop-120).
//
// Visita las rutas publicas y verifica las redirecciones auth, recolectando:
//   - console errors (tipo 'error')
//   - page errors (uncaught exceptions)
//   - failed requests (requestfailed o respuesta >= 400, excluyendo redirecciones 3xx)
// Escribe resultTask/editor-qa/report.json + un resumen en stdout.
//
// Fail-soft: si no hay navegador (Playwright sin binario), imprime guia y sale 0
// con un reporte vacio (no aborta el ciclo).
//
// Uso:
//   node scripts/editor-qa-sweep.mjs            (contra http://127.0.0.1:3000)
//   QA_BASE=http://127.0.0.1:3100 node scripts/editor-qa-sweep.mjs

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASE = process.env.QA_BASE || "http://127.0.0.1:3000";

// Rutas publicas a barrer.
const PUBLIC = ["/", "/login", "/register", "/blog", "/explore", "/recursos", "/roadmap"];
// Rutas protegidas: sin sesion deben redirigir a /login.
const PROTECTED = ["/dashboard", "/gallery", "/builder", "/editor", "/cloud", "/lab"];

const NAV_TIMEOUT = 120_000;
const SETTLE_MS = 1500;

async function sweepRoute(page, route) {
  const errors = [];
  const failed = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  };
  const onPageError = (err) => errors.push("PAGEERROR: " + (err?.message || String(err)));
  const onRequestFailed = (req) =>
    failed.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText || "requestfailed"}`);
  const onResponse = (res) => {
    const s = res.status();
    if (s >= 400 && s < 600) failed.push(`${res.status()} ${reqMethod(res)} ${res.url()}`);
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);

  let redirectedTo = null;
  try {
    const resp = await page.goto(BASE + route, {
      waitUntil: "load",
      timeout: NAV_TIMEOUT,
    });
    await page.waitForTimeout(SETTLE_MS);
    const finalUrl = page.url();
    if (finalUrl !== BASE + route && !finalUrl.startsWith(BASE + route)) {
      redirectedTo = finalUrl.replace(BASE, "");
    }
    void resp;
  } catch (e) {
    errors.push("NAV_ERROR: " + (e?.message || String(e)));
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }
  return { route, redirectedTo, errors, failed };
}

// Playwright Response no expone method directo en el handler; lo reconstruimos con request.
function reqMethod(res) {
  try {
    return res.request().method();
  } catch {
    return "?";
  }
}

async function main() {
  const outDir = resolve(ROOT, "resultTask", "editor-qa");
  mkdirSync(outDir, { recursive: true });

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  } catch (e) {
    const msg = `No se pudo lanzar el navegador (Playwright). Instala con: npx playwright install chromium\n  -> ${e?.message || e}`;
    const report = { base: BASE, ok: false, note: msg, public: [], protected: [] };
    writeFileSync(resolve(outDir, "report.json"), JSON.stringify(report, null, 2));
    console.log(msg);
    return 0;
  }

  const results = { base: BASE, ok: true, public: [], protected: [] };
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();

  for (const r of PUBLIC) {
    const row = await sweepRoute(page, r);
    results.public.push(row);
    const n = row.errors.length + row.failed.length;
    console.log(`[public] ${r} -> errores=${row.errors.length} fallos=${row.failed.length}${row.redirectedTo ? " (->" + row.redirectedTo + ")" : ""}`);
    for (const e of row.errors) console.log(`    E: ${e.slice(0, 200)}`);
    for (const f of row.failed) console.log(`    F: ${f.slice(0, 200)}`);
    void n;
  }

  for (const r of PROTECTED) {
    const row = await sweepRoute(page, r);
    // Esperado: redireccion a /login (no es error en si).
    const expectedRedirect = row.redirectedTo && row.redirectedTo.startsWith("/login");
    results.protected.push(row);
    console.log(
      `[protected] ${r} -> redirect=${row.redirectedTo || "(ninguno)"}${expectedRedirect ? " OK" : " <-- REVISAR"} errores=${row.errors.length} fallos=${row.failed.length}`,
    );
    for (const e of row.errors) console.log(`    E: ${e.slice(0, 200)}`);
    for (const f of row.failed) console.log(`    F: ${f.slice(0, 200)}`);
  }

  await browser.close();

  writeFileSync(resolve(outDir, "report.json"), JSON.stringify(results, null, 2));
  const totalErrors = results.public.reduce((a, r) => a + r.errors.length + r.failed.length, 0);
  console.log(`\n[qa] reporte -> ${resolve(outDir, "report.json")}`);
  console.log(`[qa] errores/fallos totales en publicas: ${totalErrors}`);
  return 0;
}

main().then((code) => process.exit(code ?? 0));
