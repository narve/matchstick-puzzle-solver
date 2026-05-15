import { defineConfig, devices } from '@playwright/test';

// Edge channel — we rely on the system-installed Microsoft Edge, matching
// what the MCP browser tooling uses. No need to `npx playwright install`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Locally: list reporter only. In CI: also produce an HTML report so
  // the workflow can upload it as an artifact.
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  use: {
    baseURL: 'http://localhost:8766',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Plain static server (no file watching) so Playwright writing to
    // playwright-report/ etc. during the run doesn't trigger a reload
    // mid-test. python3 is pre-installed everywhere we care about.
    command: 'python3 -m http.server 8766 --bind 127.0.0.1',
    url: 'http://localhost:8766/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});
