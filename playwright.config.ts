import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:5198${process.env.VITE_BASE_PATH ?? '/'}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5198 --strictPort', url: `http://127.0.0.1:5198${process.env.VITE_BASE_PATH ?? '/'}`, reuseExistingServer: false, timeout: 120_000 },
});
