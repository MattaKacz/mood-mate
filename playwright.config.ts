import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Wczytaj zmienne środowiskowe z .env.test
// Wymagane zmienne:
// - SUPABASE_URL: URL instancji testowej Supabase
// - SUPABASE_KEY: Klucz publiczny instancji testowej Supabase
// - TEST_DISABLE_RATE_LIMITING: "true" - wyłącza rate limiting dla testów E2E
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 30 * 1000,
  globalTeardown: "./tests/playwright/teardown.ts",
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: process.env.CI ? "never" : "on-failure" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:e2e",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
