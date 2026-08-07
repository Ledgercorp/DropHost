import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    passWithNoTests: true,
    css: true,
    exclude: [...configDefaults.exclude, "**/e2e/**"],
  },
});
