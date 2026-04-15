import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/backend/**/*.ts", "src/shared/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
    },
  },
});
