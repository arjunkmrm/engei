/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import dts from "vite-plugin-dts"
import path from "path"

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true, exclude: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test-setup.ts"] }), cloudflare()],
  resolve: {
    alias: {
      // Force single instance of @codemirror/state when using file: fork of @codemirror/view
      "@codemirror/state": path.resolve(__dirname, "node_modules/@codemirror/state/dist/index.js"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["tests/live-layout/**", "node_modules/**"],
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "engei",
    },
    rollupOptions: {
      external: [
        "react", "react-dom", "react/jsx-runtime", "engei-widgets",
        // Externalize CodeMirror so the consuming app can code-split it
        /^codemirror/,
        /^@codemirror\//,
        /^@lezer\//,
      ],
    },
  },
})