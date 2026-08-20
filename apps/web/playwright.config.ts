import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
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
