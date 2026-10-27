import { defineConfig, devices } from '@playwright/test';

// On a normal computer run `npx playwright install chromium` once.
// If a Chromium is already installed somewhere else, point E2E_CHROME at it.
const executablePath = process.env.E2E_CHROME || undefined;
const port = Number(process.env.E2E_PORT) || 5173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
    launchOptions: { executablePath },
  },
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } }],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
