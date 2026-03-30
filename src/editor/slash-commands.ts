/**
 * Slash command extension for CodeMirror 6.
 *
 * When the user types `/` at the start of a line, shows a placeholder
 * "Describe what to create...". On Enter, extracts the prompt and calls
 * the onSlashCommand callback. The callback returns markdown to insert.
 */

import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import { Facet, type Extension, type Range } from "@codemirror/state"

// ─── Facet for the callback ────────────────────────────────

export type SlashCommandHandler = (prompt: string, context: string) => Promise<string>

export const slashCommandHandler = Facet.define<SlashCommandHandler, SlashCommandHandler | null>({
  combine: (values) => values.length > 0 ? values[values.length - 1] : null,
})

// ─── Placeholder widget ────────────────────────────────────

class SlashPlaceholder extends WidgetType {
  toDOM() {
    const span = document.createElement("span")
    span.className = "cm-slash-placeholder"
    span.textContent = "Describe what to create..."
    return span
  }

  ignoreEvent() { return true }
}

const placeholder = new SlashPlaceholder()

// ─── ViewPlugin: decorations + Enter handler ───────────────

function buildDecos(view: EditorView): DecorationSet {
  const { state } = view
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  const decos: Range<Decoration>[] = []

  // Only show placeholder when line is exactly "/" (just the slash, nothing typed yet)
  if (line.text === "/") {
    decos.push(
      Decoration.line({ class: "cm-slash-line" }).range(line.from),
      Decoration.widget({ widget: placeholder, side: 1 }).range(line.to),
    )
  } else if (line.text.startsWith("/") && line.text.length > 1) {
    // User is typing a prompt — style the line
    decos.push(
      Decoration.line({ class: "cm-slash-line cm-slash-typing" }).range(line.from),
    )
  }

  return Decoration.set(decos, true)
}

export function slashCommands(): Extension {
  const plugin = ViewPlugin.define(
    (view) => ({
      decorations: buildDecos(view),
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet) {
          this.decorations = buildDecos(update.view)
        }
      },
    }),
    { decorations: (v) => v.decorations },
  )

  // Keymap: intercept Enter on a slash command line
  const enterHandler = EditorView.domEventHandlers({
    keydown(event, view) {
      if (event.key !== "Enter") return false

      const { state } = view
      const { head } = state.selection.main
      const line = state.doc.lineAt(head)

      // Only handle lines starting with /
      if (!line.text.startsWith("/") || line.text.length <= 1) return false

      const prompt = line.text.slice(1).trim()
      if (!prompt) return false

      event.preventDefault()

      const handler = state.facet(slashCommandHandler)
      if (!handler) return true

      // Gather context: preceding lines (up to 50 lines above)
      const startLine = Math.max(1, line.number - 50)
      const contextLines: string[] = []
      for (let ln = startLine; ln < line.number; ln++) {
        contextLines.push(state.doc.line(ln).text)
      }
      const context = contextLines.join("\n")

      // Replace the /prompt line with a loading indicator
      const loadingText = `> Generating...`
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: loadingText },
      })

      // Call the handler
      handler(prompt, context).then((markdown) => {
        // Replace the loading indicator with the generated content
        const currentLine = view.state.doc.lineAt(line.from)
        view.dispatch({
          changes: { from: currentLine.from, to: currentLine.to, insert: markdown },
        })
      }).catch((err) => {
        // Replace loading with error
        const currentLine = view.state.doc.lineAt(line.from)
        view.dispatch({
          changes: { from: currentLine.from, to: currentLine.to, insert: `> Error: ${err.message || err}` },
        })
      })

      return true
    },
  })

  return [plugin, enterHandler]
}
