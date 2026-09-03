#!/usr/bin/env node
/**
 * editor-qa-sweep.mjs — Headless QA sweep for public + auth routes.
 * 
 * Usage: node scripts/editor-qa-sweep.mjs [--base-url=http://127.0.0.1:3000] [--headed] [--output=resultTask/editor-qa/report.json]
 * 
 * Scans public routes and auth-protected routes (expecting redirect to /login),
 * collecting console errors, uncaught exceptions, and failed network requests.
 * 
 * Fail-soft: if Playwright/browser not available, exits 0 with empty report.
 */

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

/* ------------------------------------------------------------------ */
/* Configuration                                                        */
/* ------------------------------------------------------------------ */

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_OUTPUT = resolve(ROOT, 'resultTask/editor-qa/report.json');

/** Public routes that should load without authentication */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/blog',
  '/explore',
  '/recursos',
  '/roadmap',
  '/herramientas',
  '/metrics',
  '/chaos-game',
  '/hypothesis-quest',
];

/** Protected routes that should redirect to /login when unauthenticated */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/gallery',
  '/builder',
  '/editor',
  '/cloud',
  '/lab',
  '/studio',
  '/content',
  '/content/history',
  '/playground',
  '/prioritize',
  '/goal',
  '/agents',
  '/ebooks',
  '/design-system',
  '/workspace',
  '/connections',
];

/** Severity levels for console messages */
const CONSOLE_SEVERITY = ['error', 'warning', 'info', 'debug', 'log'];

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

/** @typedef {Object} ConsoleEntry */
/** @property {string} type */
/** @property {string} text */
/** @property {{url: string, lineNumber: number, columnNumber: number}} [location] */

/** @typedef {Object} RequestFailure */
/** @property {string} url */
/** @property {string} method */
/** @property {number} [status] */
/** @property {string} [statusText] */
/** @property {string} [errorText] */
/** @property {string} resourceType */

/** @typedef {Object} PageReport */
/** @property {string} route */
/** @property {'success'|'redirect'|'error'} status */
/** @property {string} finalUrl */
/** @property {ConsoleEntry[]} consoleErrors */
/** @property {ConsoleEntry[]} consoleWarnings */
/** @property {string[]} uncaughtExceptions */
/** @property {RequestFailure[]} failedRequests */
/** @property {number} loadTimeMs */

/** @typedef {Object} SweepReport */
/** @property {string} timestamp */
/** @property {string} baseUrl */
/** @property {{totalRoutes: number, successful: number, redirects: number, errors: number, totalConsoleErrors: number, totalConsoleWarnings: number, totalFailedRequests: number}} summary */
/** @property {PageReport[]} pages */

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function parseArgs() {
  const args = process.argv.slice(2);
  const baseUrl = args.find(a => a.startsWith('--base-url='))?.split('=')[1] || DEFAULT_BASE_URL;
  const headed = args.includes('--headed');
  const output = args.find(a => a.startsWith('--output='))?.split('=')[1] || DEFAULT_OUTPUT;
  return { baseUrl, headed, output };
}

function ensureOutputDir(path) {
  const dir = resolve(path, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/* ------------------------------------------------------------------ */
/* Core sweep logic                                                     */
/* ------------------------------------------------------------------ */

async function sweepRoute(page, route, baseUrl, expectRedirect = false) {
  const url = `${baseUrl}${route}`;
  const consoleErrors = [];
  const consoleWarnings = [];
  const uncaughtExceptions = [];
  const failedRequests = [];

  // Listen to console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const location = msg.location();

    if (type === 'error') {
      consoleErrors.push({ type, text, location });
    } else if (type === 'warning') {
      consoleWarnings.push({ type, text, location });
    }
  });

  // Listen to uncaught exceptions
  page.on('pageerror', error => {
    uncaughtExceptions.push(error.message);
  });

  // Listen to failed requests
  page.on('requestfailed', request => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      status: undefined,
      statusText: undefined,
      errorText: request.failure()?.errorText,
      resourceType: request.resourceType(),
    });
  });

  // Listen to failed responses (4xx, 5xx)
  page.on('response', response => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        statusText: response.statusText(),
        errorText: undefined,
        resourceType: response.request().resourceType(),
      });
    }
  });

  const startTime = Date.now();

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: expectRedirect ? 5000 : 15000,
    });

    const loadTimeMs = Date.now() - startTime;
    const finalUrl = page.url();
    const statusCode = response?.status();

    let status;

    if (expectRedirect && finalUrl.includes('/login') && !route.startsWith('/login')) {
      status = 'redirect';
    } else if (statusCode && statusCode >= 400) {
      status = 'error';
    } else {
      status = 'success';
    }

    return {
      route,
      status,
      finalUrl,
      consoleErrors,
      consoleWarnings,
      uncaughtExceptions,
      failedRequests,
      loadTimeMs,
    };
  } catch (err) {
    return {
      route,
      status: 'error',
      finalUrl: url,
      consoleErrors,
      consoleWarnings,
      uncaughtExceptions,
      failedRequests: [...failedRequests, {
        url,
        method: 'GET',
        errorText: err instanceof Error ? err.message : String(err),
        resourceType: 'document',
      }],
      loadTimeMs: Date.now() - startTime,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

async function main() {
  const { baseUrl, headed, output } = parseArgs();
  ensureOutputDir(output);

  console.log(`[editor-qa] Starting sweep`);
  console.log(`[editor-qa] Base URL: ${baseUrl}`);
  console.log(`[editor-qa] Public routes: ${PUBLIC_ROUTES.length}`);
  console.log(`[editor-qa] Protected routes: ${PROTECTED_ROUTES.length}`);
  console.log(`[editor-qa] Output: ${output}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: !headed });
  } catch (err) {
    console.warn(`[editor-qa] Browser not available, skipping sweep: ${err instanceof Error ? err.message : String(err)}`);
    const emptyReport = {
      timestamp: new Date().toISOString(),
      baseUrl,
      summary: { totalRoutes: 0, successful: 0, redirects: 0, errors: 0, totalConsoleErrors: 0, totalConsoleWarnings: 0, totalFailedRequests: 0 },
      pages: [],
    };
    writeFileSync(output, JSON.stringify(emptyReport, null, 2));
    console.log(`[editor-qa] Empty report written to ${output}`);
    return;
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  const allRoutes = [
    ...PUBLIC_ROUTES.map(r => ({ route: r, expectRedirect: false })),
    ...PROTECTED_ROUTES.map(r => ({ route: r, expectRedirect: true })),
  ];

  const pages = [];

  for (const { route, expectRedirect } of allRoutes) {
    process.stdout.write(`[editor-qa] Testing ${route}... `);
    const report = await sweepRoute(page, route, baseUrl, expectRedirect);
    pages.push(report);
    console.log(`${report.status} (${report.loadTimeMs}ms, ${report.consoleErrors.length} err, ${report.failedRequests.length} failed)`);
  }

  await browser.close();

  // Compute summary
  const summary = {
    totalRoutes: pages.length,
    successful: pages.filter(p => p.status === 'success').length,
    redirects: pages.filter(p => p.status === 'redirect').length,
    errors: pages.filter(p => p.status === 'error').length,
    totalConsoleErrors: pages.reduce((sum, p) => sum + p.consoleErrors.length, 0),
    totalConsoleWarnings: pages.reduce((sum, p) => sum + p.consoleWarnings.length, 0),
    totalFailedRequests: pages.reduce((sum, p) => sum + p.failedRequests.length, 0),
  };

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl,
    summary,
    pages,
  };

  writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(`\n[editor-qa] Sweep complete`);
  console.log(`[editor-qa] Summary: ${summary.successful} OK, ${summary.redirects} redirects, ${summary.errors} errors`);
  console.log(`[editor-qa] Console: ${summary.totalConsoleErrors} errors, ${summary.totalConsoleWarnings} warnings`);
  console.log(`[editor-qa] Failed requests: ${summary.totalFailedRequests}`);
  console.log(`[editor-qa] Report written to ${output}`);

  // Exit with error code if there are errors (but not for redirects)
  if (summary.errors > 0 || summary.totalConsoleErrors > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(`[editor-qa] Fatal error:`, err);
  process.exit(1);
});