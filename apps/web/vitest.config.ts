import { fileURLToPath } from "node:url"

import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Resolve "@/..." the same way tsconfig/Next does: to the app root.
const appRoot = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": appRoot,
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    // Playwright specs live in ./e2e and run under `playwright test`, not Vitest.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
})
