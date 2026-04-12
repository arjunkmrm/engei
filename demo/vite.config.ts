import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import fs from "fs"

export default defineConfig({
  resolve: {
    dedupe: ["@codemirror/search", "@codemirror/state", "@codemirror/view", "codemirror"],
    alias: {
      "@codemirror/search": path.resolve(__dirname, "../node_modules/@codemirror/search"),
      "@codemirror/state": path.resolve(__dirname, "../node_modules/@codemirror/state"),
      "@codemirror/view": path.resolve(__dirname, "../node_modules/@codemirror/view"),
    },
  },
  plugins: [
    react(),
    // Serve fixture files from the forks directory for Playwright tests
    {
      name: "serve-fixtures",
      configureServer(server) {
        server.middlewares.use("/fixtures", (req, res, next) => {
          const fixturePath = path.resolve(__dirname, "../../forks/cm-view-pretext/test/fixtures", req.url!.slice(1))
          if (fs.existsSync(fixturePath)) {
            res.setHeader("Content-Type", "text/plain")
            fs.createReadStream(fixturePath).pipe(res)
          } else {
            next()
          }
        })
      },
    },
  ],
  root: __dirname,
})
