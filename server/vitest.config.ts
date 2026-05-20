import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false, // integration tests share one DB
    setupFiles: ["./vitest.setup.ts"],
  },
});
