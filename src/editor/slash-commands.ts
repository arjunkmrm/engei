/**
 * Slash command extension for CodeMirror 6.
 *
 * When the user types `/` at the start of a line, shows a placeholder
 * "Describe what to create...". On Enter, extracts the prompt, shows
 * a spinner, and calls the onSlashCommand callback.
 */

import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import { Facet, StateField, StateEffect, type Extension, type Range } from "@codemirror/state"

// ─── Facet for the callback ────────────────────────────────

export type SlashCommandHandler = (prompt: string, context: string) => Promise<string>

export const slashCommandHandler = Facet.define<SlashCommandHandler, SlashCommandHandler | null>({
  combine: (values) => values.length > 0 ? values[values.length - 1] : null,
})

// ─── State: which line is loading ──────────────────────────

const setLoading = StateEffect.define<{ lineFrom: number } | null>()

const loadingState = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setLoading)) return e.value?.lineFrom ?? null
    }
    return value
  },
})

// ─── Widgets ───────────────────────────────────────────────

class SlashPlaceholder extends WidgetType {
  toDOM() {
    const span = document.createElement("span")
    span.className = "cm-slash-placeholder"
    span.textContent = "Describe what to create..."
    return span
  }
  ignoreEvent() { return true }
}

class SpinnerWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span")
    span.className = "cm-slash-spinner"
    return span
  }
  ignoreEvent() { return true }
}

const placeholder = new SlashPlaceholder()
const spinner = new SpinnerWidget()

// ─── ViewPlugin: decorations ───────────────────────────────

function buildDecos(view: EditorView): DecorationSet {
  const { state } = view
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  const loadingLine = state.field(loadingState)
  const decos: Range<Decoration>[] = []

  // Loading spinner on the loading line
  if (loadingLine !== null) {
    try {
      const lLine = state.doc.lineAt(loadingLine)
      if (lLine.text.startsWith("/")) {
        decos.push(Decoration.line({ class: "cm-slash-line" }).range(lLine.from))
        decos.push(Decoration.widget({ widget: spinner, side: 1 }).range(lLine.to))
      }
    } catch {}
  }

  // Only show placeholder/styling when NOT loading
  if (loadingLine === null) {
    if (line.text === "/") {
      decos.push(
        Decoration.line({ class: "cm-slash-line" }).range(line.from),
        Decoration.widget({ widget: placeholder, side: 1 }).range(line.to),
      )
    } else if (line.text.startsWith("/") && line.text.length > 1) {
      decos.push(
        Decoration.line({ class: "cm-slash-line" }).range(line.from),
      )
    }
  }

  return Decoration.set(decos, true)
}

/** Enter command for slash lines. Call before smartEnter in the keymap. */
export function slashEnter(view: EditorView): boolean {
  const { state } = view
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)

  if (!line.text.startsWith("/") || line.text.length <= 1) return false

  const prompt = line.text.slice(1).trim()
  if (!prompt) return false

  const handler = state.facet(slashCommandHandler)
  if (!handler) return false

  // Gather context
  const startLine = Math.max(1, line.number - 50)
  const contextLines: string[] = []
  for (let ln = startLine; ln < line.number; ln++) {
    contextLines.push(state.doc.line(ln).text)
  }
  const context = contextLines.join("\n")

  // Set loading state — spinner will appear via decoration
  const lineFrom = line.from
  view.dispatch({ effects: setLoading.of({ lineFrom }) })

  handler(prompt, context).then((markdown) => {
    // Clear loading, replace the /prompt line with result
    const currentLine = view.state.doc.lineAt(lineFrom)
    view.dispatch({
      effects: setLoading.of(null),
      changes: { from: currentLine.from, to: currentLine.to, insert: markdown },
    })
  }).catch((err) => {
    const currentLine = view.state.doc.lineAt(lineFrom)
    view.dispatch({
      effects: setLoading.of(null),
      changes: { from: currentLine.from, to: currentLine.to, insert: `> Error: ${err.message || err}` },
    })
  })

  return true
}

export function slashCommands(): Extension {
  const plugin = ViewPlugin.define(
    (view) => ({
      decorations: buildDecos(view),
      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.transactions.some(t => t.effects.some(e => e.is(setLoading)))) {
          this.decorations = buildDecos(update.view)
        }
      },
    }),
    { decorations: (v) => v.decorations },
  )

  return [plugin, loadingState]
}
