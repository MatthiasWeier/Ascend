import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // DB-touching tests (streak, personal-records, goal-contributions) run
    // sequentially against a shared ascend_test database, not in parallel
    // worker processes - avoids needing per-test DB isolation for a test
    // suite this size. Pure-logic tests (german-time, totp, csv-import)
    // don't care either way.
    fileParallelism: false,
  },
});
