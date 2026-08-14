import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'python start.py --skip-setup --web',
    url: 'http://localhost:3000/login',
    reuseExistingServer: false,
    timeout: 240_000,
    cwd: '../..',
  },
});
