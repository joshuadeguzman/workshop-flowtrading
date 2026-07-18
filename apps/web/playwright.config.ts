import { defineConfig } from "@playwright/test"

// Playwright drives the REAL Buy/Sell screen in a real browser.
//   npx playwright test              headless run
//   npx playwright test --headed     watch the browser live
//   npx playwright test --ui         time-travel UI (screenshots per step)
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts", // videos + traces land here
  fullyParallel: false,
  webServer: {
    command: "npx next dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000, // Next 16's first compile can be slow
  },
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    video: "on", // .webm recording per test
    trace: "on", // always record a trace so `show-trace` has something to open
    // Set SLOWMO=800 to slow every action down to 800ms so a headed run is
    // actually watchable (the flow otherwise completes in well under a second).
    launchOptions: {
      slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 0,
    },
  },
})
