import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    testTimeout: 30000,
    hookTimeout: 30000,
    environmentMatchGlobs: [
      ["test/react/**", "jsdom"],
      ["test/vue/**", "jsdom"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "node_modules/",
        "test/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/index.ts",
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
});

