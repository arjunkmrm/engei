import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { rust } from "@codemirror/lang-rust"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import type { Extension } from "@codemirror/state"

export function getLanguage(filename?: string): Extension[] {
  const ext = filename?.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "js": case "jsx": case "ts": case "tsx":
      return [javascript({ jsx: true, typescript: ext.includes("ts") })]
    case "py": return [python()]
    case "rs": return [rust()]
    case "css": return [css()]
    case "html": return [html()]
    case "json": return [json()]
    case "md": case "mdx": case "markdown": return [markdown()]
    default: return []
  }
}
