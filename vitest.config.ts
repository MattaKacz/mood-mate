import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()] as NonNullable<UserConfig["plugins"]>,
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    css: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/services/mood/**",
        "src/lib/utils/dashboard.ts",
        "src/lib/utils/error-handler.ts",
        "src/lib/utils/rate-limiter.ts",
        "src/lib/utils/supabase-error-mapper.ts",
        "src/lib/validation/mood/create-entry.schema.ts",
        "src/lib/openrouter/schemas/mood-suggestion.ts",
        "src/components/hooks/useAddMoodMutation.ts",
        "src/components/app/mood/AddMoodForm.tsx",
      ],
      thresholds: {
        lines: 60,
        statements: 60,
        functions: 60,
        branches: 60,
      },
    },
  },
});
