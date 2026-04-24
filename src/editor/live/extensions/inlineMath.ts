/**
 * Inline math extension for CodeMirror 6.
 *
 * Replaces $...$ with rendered KaTeX inline when the cursor is elsewhere.
 * When the cursor is on the math expression, shows raw LaTeX for editing.
 */

import { Decoration, EditorView, WidgetType } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"
import { cursorOnLine } from "../cursor"

const KATEX_JS_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js"
const KATEX_CSS_CDN = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"

let katexLoaded = false
let katexLoading: Promise<void> | null = null
let cssLoaded = false

function ensureKatexCSS() {
  if (cssLoaded) return
  cssLoaded = true
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = KATEX_CSS_CDN
  document.head.appendChild(link)
}

function loadKatex(): Promise<void> {
  if (katexLoaded) return Promise.resolve()
  if (katexLoading) return katexLoading
  katexLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = KATEX_JS_CDN
    script.onload = () => { katexLoaded = true; resolve() }
    script.onerror = reject
    document.head.appendChild(script)
  })
  return katexLoading
}

class InlineMathWidget extends WidgetType {
  constructor(readonly expression: string, readonly theme: "dark" | "light") {
    super()
  }

  eq(other: InlineMathWidget): boolean {
    return this.expression === other.expression && this.theme === other.theme
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span")
    span.className = "cm-inline-math"
    span.style.color = this.theme === "dark" ? "#e8e6e3" : "#2a2520"

    ensureKatexCSS()
    loadKatex().then(() => {
      const katex = (window as any).katex
      if (katex) {
        try {
          katex.render(this.expression, span, {
            displayMode: false,
            throwOnError: false,
            trust: false,
          })
        } catch {
          span.textContent = this.expression
        }
      }
    })

    return span
  }

  ignoreEvent(): boolean {
    return false
  }
}

// Match $...$ but not $$...$$, not escaped \$, and not empty $$
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g

function buildMathDecos(
  state: EditorState,
  theme: "dark" | "light",
): DecorationSet {
  const widgets: Range<Decoration>[] = []
  const doc = state.doc
  const sel = state.selection.ranges

  for (let i = 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text
    INLINE_MATH_RE.lastIndex = 0
    let match

    while ((match = INLINE_MATH_RE.exec(text)) !== null) {
      const from = line.from + match.index
      const to = from + match[0].length
      const expression = match[1].trim()

      // Show raw LaTeX when cursor is on this line (Obsidian-style)
      if (cursorOnLine(state, sel, from, to)) continue

      const deco = Decoration.replace({
        widget: new InlineMathWidget(expression, theme),
      })
      widgets.push(deco.range(from, to))
    }
  }

  return Decoration.set(widgets, true)
}

export function inlineMath(opts?: {
  theme?: "dark" | "light"
}): Extension {
  const theme = opts?.theme ?? "dark"

  return StateField.define<DecorationSet>({
    create(state) {
      return buildMathDecos(state, theme)
    },
    update(prev, tr) {
      // Always rebuild on selection change (cursor moves reveal/hide math)
      if (tr.docChanged || tr.selection) {
        return buildMathDecos(tr.state, theme)
      }
      return prev
    },
    provide: f => EditorView.decorations.from(f),
  })
}
