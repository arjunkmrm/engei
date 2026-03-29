import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/live-layout",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5199",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "cd demo && bunx vite --port 5199",
    url: "http://localhost:5199",
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
})
