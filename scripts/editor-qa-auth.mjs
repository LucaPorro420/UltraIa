// Barrido QA autenticado (Part A-2 de loop-120): reproduce errores de runtime React
// en las rutas protegidas del IDE/editor/builder tras login como admin.
//
// Usa el form de login (name=email / name=password) y navega las rutas del shell,
// capturando console errors, page errors (uncaught) y failed requests, mas detecta
// el overlay de error de Next.js ("Unhandled Runtime Error" / "client-side exception").
//
// Uso:
//   QA_BASE=http://127.0.0.1:3001 node scripts/editor-qa-auth.mjs
//
// Fail-soft: si no hay navegador, imprime guia y sale 0.

import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASE = process.env.QA_BASE || "http://127.0.0.1:3001";
const USER = process.env.QA_USER || "admin";
const PASS = process.env.QA_PASS || "admin";

const NAV_TIMEOUT = 120_000;
const SETTLE_MS = 2000;

const AUTH_ROUTES = [
  "/dashboard",
  "/gallery",
  "/builder",
  "/editor",
  "/cloud",
  "/lab",
  "/ebooks",
  "/studio",
  "/workspace",
  "/metrics",
  "/herramientas",
  "/goal",
];

// Preflight: detecta >1 PROCESO (PID) escuchando en el puerto (server duplicado que
// corrompe .next => chunks 404 => React no hidrata). No fatals; solo advierte.
// Se deduplica por PID (un mismo server aparece como listener IPv4 + IPv6).
function preflightPortConflict(base) {
  try {
    const u = new URL(base);
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    const out = execSync("netstat -ano", { windowsHide: true, timeout: 8000 }).toString();
    const lines = out.split("\n").filter((l) => l.includes(`:${port}`) && l.includes("LISTENING"));
    const pids = new Set(
      lines.map((l) => (l.match(/LISTENING\s+(\d+)\s*$/) || [])[1]).filter(Boolean)
    );
    if (pids.size > 1) {
      console.log(`[preflight] ADVERTENCIA: ${pids.size} servers (PIDs ${[...pids].join(",")}) en :${port}.`);
      console.log("[preflight] Posible .next corrupto por server duplicado. Ejecuta: npm run dev:clean");
    } else {
      console.log(`[preflight] puerto :${port} -> ${pids.size} server (ok)`);
    }
  } catch {
    /* netstat no disponible: ignora */
  }
}

// Pre-calentamiento: en un dev server frio los chunks globales del app-router
// (main-app.js / app-pages-internals.js / app/layout.css) no existen hasta que la
// primera ruta compila. Si el navegador los pide antes, devuelven 404 (MIME html)
// y React no hidrata. Calentamos /login y esperamos a que esos chunks den 200.
async function prewarm(base) {
  const get = async (p) => {
    try { return (await fetch(base + p)).status; } catch { return 0; }
  };
  await get("/login"); // dispara el compile de la ruta
  const chunks = [
    "/_next/static/chunks/main-app.js",
    "/_next/static/chunks/app-pages-internals.js",
    "/_next/static/css/app/layout.css",
  ];
  for (let i = 0; i < 40; i++) {
    const states = await Promise.all(chunks.map(get));
    if (states.every((s) => s === 200)) { console.log("[prewarm] chunks globales 200 (ok)"); return; }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log("[prewarm] chunks globales no todos 200 tras calentar (continuo igual)");
}

async function collect(page) {
  const errors = [];
  const failed = [];
  const onConsole = (m) => { if (m.type() === "error") errors.push(m.text()); };
  const onPageError = (e) => errors.push("PAGEERROR: " + (e?.message || String(e)));
  const onReqFail = (r) => {
    const t = r.failure()?.errorText || "";
    if (t.includes("ERR_ABORTED")) return; // abort benigno por navegacion post-submit
    failed.push(`${r.method?.() || "?"} ${r.url()} :: ${t || "reqfail"}`);
  };
  const onResp = (r) => { const s = r.status(); if (s >= 400 && s < 600) failed.push(`${s} ${r.request().method()} ${r.url()}`); };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onReqFail);
  page.on("response", onResp);
  return { errors, failed, off: () => { page.off("console", onConsole); page.off("pageerror", onPageError); page.off("requestfailed", onReqFail); page.off("response", onResp); } };
}

async function checkOverlay(page) {
  try {
    const txt = await page.evaluate(() => document.body?.innerText || "");
    if (/Unhandled Runtime Error/i.test(txt) || /client-side exception/i.test(txt) || /Application error/i.test(txt)) {
      const snippet = txt.split("\n").filter((l) => /error/i.test(l)).slice(0, 5).join(" | ").slice(0, 400);
      return snippet || "overlay de error detectado";
    }
  } catch { /* ignore */ }
  return null;
}

async function main() {
  const outDir = resolve(ROOT, "resultTask", "editor-qa");
  mkdirSync(outDir, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
  } catch (e) {
    writeFileSync(resolve(outDir, "auth-report.json"), JSON.stringify({ base: BASE, ok: false, note: "Playwright sin navegador: npx playwright install chromium" }, null, 2));
    console.log("No se pudo lanzar navegador: " + (e?.message || e));
    return 0;
  }

  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  // --- Preflight + Prewarm + Login ---
  preflightPortConflict(BASE);
  await prewarm(BASE);
  const login = await collect(page);
  let loginOk = false;
  try {
    await page.goto(BASE + "/login", { waitUntil: "load", timeout: NAV_TIMEOUT });
    await page.waitForTimeout(SETTLE_MS);
    await page.fill('input[name="email"]', USER);
    await page.fill('input[name="password"]', PASS);
    await page.click('button[type="submit"]', { timeout: NAV_TIMEOUT });
    await page.waitForURL("**/dashboard**", { timeout: NAV_TIMEOUT }).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);
    const url = page.url();
    loginOk = url.includes("/dashboard");
    console.log(`[login] -> ${url} (${loginOk ? "OK" : "REVISAR"})`);
    for (const er of login.errors) console.log("   E: " + er.slice(0, 200));
    for (const f of login.failed) console.log("   F: " + f.slice(0, 200));
  } catch (e) {
    console.log("[login] NAV_ERROR: " + (e?.message || e));
  } finally { login.off(); }

  if (!loginOk) {
    console.log("[auth] login fallo; no se pueden barrer rutas protegidas.");
    await browser.close();
    writeFileSync(resolve(outDir, "auth-report.json"), JSON.stringify({ base: BASE, loginOk, routes: [] }, null, 2));
    return 0;
  }

  const results = { base: BASE, loginOk: true, routes: [] };
  for (const r of AUTH_ROUTES) {
    const c = await collect(page);
    try {
      await page.goto(BASE + r, { waitUntil: "load", timeout: NAV_TIMEOUT });
      await page.waitForTimeout(SETTLE_MS);
      const overlay = await checkOverlay(page);
      if (overlay) c.errors.push("OVERLAY: " + overlay);
      // Interaccion ligera: si hay tabs, clic en el segundo para disparar render.
      const tabs = await page.$$('[role="tab"]').catch(() => []);
      if (tabs.length > 1) { try { await tabs[1].click(); await page.waitForTimeout(600); } catch {} }
    } catch (e) {
      c.errors.push("NAV_ERROR: " + (e?.message || e));
    } finally { c.off(); }
    results.routes.push({ route: r, errors: c.errors, failed: c.failed });
    console.log(`[auth] ${r} -> errores=${c.errors.length} fallos=${c.failed.length}`);
    for (const er of c.errors) console.log("    E: " + er.slice(0, 240));
    for (const f of c.failed) console.log("    F: " + f.slice(0, 200));
  }

  await browser.close();
  writeFileSync(resolve(outDir, "auth-report.json"), JSON.stringify(results, null, 2));
  const total = results.routes.reduce((a, x) => a + x.errors.length + x.failed.length, 0);
  console.log(`\n[auth] reporte -> ${resolve(outDir, "auth-report.json")}`);
  console.log(`[auth] total errores/fallos en rutas protegidas: ${total}`);
  return 0;
}

main().then((c) => process.exit(c ?? 0));
