import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./", import.meta.url)) };

export default defineConfig(({ mode }) => ({
  resolve: { alias },
  test: {
    // Loads .env / .env.local (all prefixes) for integration tests.
    env: loadEnv(mode, process.cwd(), ""),
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // Tests share one local database; run files sequentially.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
}));
