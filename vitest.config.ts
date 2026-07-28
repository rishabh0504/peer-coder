import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@agents": path.resolve(__dirname, "./src/agents"),
      "@cli": path.resolve(__dirname, "./src/cli"),
      "@config": path.resolve(__dirname, "./src/config"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@providers": path.resolve(__dirname, "./src/providers"),
      "@prompts": path.resolve(__dirname, "./src/prompts"),
      "@tools": path.resolve(__dirname, "./src/tools"),
      "@workspace": path.resolve(__dirname, "./src/workspace"),
      "@security": path.resolve(__dirname, "./src/security"),
      "@observability": path.resolve(__dirname, "./src/observability"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@core-types": path.resolve(__dirname, "./src/core-types"),
      "@runtime": path.resolve(__dirname, "./src/runtime"),
    },
  },
});
