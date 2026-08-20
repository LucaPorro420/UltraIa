// -----------------------------------------------------------------------------
// playwright.config.ts — smoke/E2E config for the UltraIa web app.
// -----------------------------------------------------------------------------
////! IPv4 EXPLICIT: 'localhost' resolves to ::1 on this machine and the dev
//! server never answers -> always use 127.0.0.1 (lesson iter-66).
//! webServer uses `py -3.12 start.py` (NOT bare `python`: the shell `python`
//! is 3.14 without uvicorn; the stack lives in 3.12 — see AGENTS.md start.py).
//! reuseExistingServer: true lets the loop reuse an already-running dev server
//! instead of spawning a second one (duplicated servers corrupt .next chunks).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  // expect.timeout lifted to 60s: the dev server recompiles on hot reload,
  // so selectors must survive slow first paints (lesson iter-66).
  expect: { timeout: 60_000 },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'py -3.12 start.py --skip-setup --web',
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: true,
    timeout: 240_000,
    cwd: '../..',
  },
});
