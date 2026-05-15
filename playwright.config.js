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
    // Static file server for the duration of the test run. Uses port 8766
    // so it doesn't clash with `npm run watch` on 8765.
    command: 'npx -y live-server --port=8766 --no-browser --quiet .',
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
