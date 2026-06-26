import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@watermart/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@watermart/product": resolve(__dirname, "packages/modules/product/src/index.ts"),
      "@watermart/catalog": resolve(__dirname, "packages/modules/catalog/src/index.ts"),
      "@watermart/inventory": resolve(__dirname, "packages/modules/inventory/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", ".next", "dist", ".turbo"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", ".next", "dist", ".turbo", "**/*.config.*"],
    },
  },
});
