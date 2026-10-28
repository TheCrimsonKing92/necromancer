import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/test/setup-content-packs.ts"],
    coverage: {
      include: ["src/game/**/*.ts"],
      exclude: ["src/game/**/*.test.ts", "src/game/types.ts"],
    },
  },
});
