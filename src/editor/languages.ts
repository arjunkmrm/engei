import { markdown } from "@codemirror/lang-markdown"
import { LanguageDescription } from "@codemirror/language"
import { GFM } from "@lezer/markdown"
import type { Extension } from "@codemirror/state"

/**
 * Language descriptions for fenced code block highlighting inside markdown.
 * Each entry lazy-loads its parser on first encounter.
 */
const codeLanguages = [
  LanguageDescription.of({ name: "javascript", alias: ["js", "jsx"], load: () => import("@codemirror/lang-javascript").then(m => m.javascript({ jsx: true })) }),
  LanguageDescription.of({ name: "typescript", alias: ["ts", "tsx"], load: () => import("@codemirror/lang-javascript").then(m => m.javascript({ jsx: true, typescript: true })) }),
  LanguageDescription.of({ name: "python", alias: ["py"], load: () => import("@codemirror/lang-python").then(m => m.python()) }),
  LanguageDescription.of({ name: "rust", alias: ["rs"], load: () => import("@codemirror/lang-rust").then(m => m.rust()) }),
  LanguageDescription.of({ name: "css", load: () => import("@codemirror/lang-css").then(m => m.css()) }),
  LanguageDescription.of({ name: "html", load: () => import("@codemirror/lang-html").then(m => m.html()) }),
  LanguageDescription.of({ name: "json", load: () => import("@codemirror/lang-json").then(m => m.json()) }),
]

// Markdown is always sync — it's the live editing language
export function getLanguage(filename?: string): Extension[] {
  const ext = filename?.split(".").pop()?.toLowerCase()
  if (ext === "md" || ext === "mdx" || ext === "markdown") {
    return [markdown({ extensions: GFM, codeLanguages })]
  }
  return []
}

// Non-markdown languages loaded on demand
export async function getLanguageAsync(filename?: string): Promise<Extension[]> {
  const ext = filename?.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "js": case "jsx": case "ts": case "tsx": {
      const { javascript } = await import("@codemirror/lang-javascript")
      return [javascript({ jsx: true, typescript: ext.includes("ts") })]
    }
    case "py": { const { python } = await import("@codemirror/lang-python"); return [python()] }
    case "rs": { const { rust } = await import("@codemirror/lang-rust"); return [rust()] }
    case "css": { const { css } = await import("@codemirror/lang-css"); return [css()] }
    case "html": { const { html } = await import("@codemirror/lang-html"); return [html()] }
    case "json": { const { json } = await import("@codemirror/lang-json"); return [json()] }
    case "md": case "mdx": case "markdown": return [markdown({ extensions: GFM })]
    default: return []
  }
}
