import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(here, "src"),
      // Next's marker import; a no-op under vitest.
      "server-only": path.resolve(here, "src/test/server-only.ts"),
    },
  },
  // Generous timeouts: the e2e tests render PDFs and run next to a dev server on the same machine.
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"], testTimeout: 30_000 },
});
