/**
 * Slash command extension for CodeMirror 6.
 *
 * Type `/` at start of a line → placeholder. Type a prompt, press Enter →
 * shows a loading game, calls the handler, inserts the result.
 */

import { Decoration, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import { Facet, StateField, StateEffect, type Extension, type Range } from "@codemirror/state"
import { randomGameWidget } from "./loading-games"

// ─── Facet for the callback ────────────────────────────────

export type SlashCommandHandler = (prompt: string, context: string) => Promise<string>

export const slashCommandHandler = Facet.define<SlashCommandHandler, SlashCommandHandler | null>({
  combine: (values) => values.length > 0 ? values[values.length - 1] : null,
})

// ─── Loading state ─────────────────────────────────────────

const setLoading = StateEffect.define<{ lineFrom: number; game: WidgetType } | null>()

const loadingState = StateField.define<{ lineFrom: number; game: WidgetType } | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setLoading)) return e.value
    }
    return value
  },
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

// ─── Decorations ───────────────────────────────────────────

function buildDecos(view: EditorView): DecorationSet {
  const { state } = view
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)
  const loading = state.field(loadingState)
  const decos: Range<Decoration>[] = []

  if (loading) {
    try {
      const lLine = state.doc.lineAt(loading.lineFrom)
      if (lLine.text.startsWith("/")) {
        decos.push(Decoration.line({ class: "cm-slash-line" }).range(lLine.from))
        decos.push(Decoration.widget({ widget: loading.game, side: 1 }).range(lLine.to))
      }
    } catch {}
  }

  if (!loading) {
    if (line.text === "/") {
      decos.push(
        Decoration.line({ class: "cm-slash-line" }).range(line.from),
        Decoration.widget({ widget: placeholder, side: 1 }).range(line.to),
      )
    } else if (line.text.startsWith("/") && line.text.length > 1) {
      decos.push(Decoration.line({ class: "cm-slash-line" }).range(line.from))
    }
  }

  return Decoration.set(decos, true)
}

// ─── Enter command ─────────────────────────────────────────

export function slashEnter(view: EditorView): boolean {
  const { state } = view
  const { head } = state.selection.main
  const line = state.doc.lineAt(head)

  if (!line.text.startsWith("/") || line.text.length <= 1) return false
  const prompt = line.text.slice(1).trim()
  if (!prompt) return false

  const handler = state.facet(slashCommandHandler)
  if (!handler) return false

  const startLine = Math.max(1, line.number - 50)
  const contextLines: string[] = []
  for (let ln = startLine; ln < line.number; ln++) {
    contextLines.push(state.doc.line(ln).text)
  }
  const context = contextLines.join("\n")
  const lineFrom = line.from

  // Pick a random game and start loading
  view.dispatch({ effects: setLoading.of({ lineFrom, game: randomGameWidget() }) })

  handler(prompt, context).then((markdown) => {
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

// ─── Extension ─────────────────────────────────────────────

export function slashCommands(): Extension {
  return [
    ViewPlugin.define(
      (view) => ({
        decorations: buildDecos(view),
        update(update: ViewUpdate) {
          if (update.docChanged || update.selectionSet || update.transactions.some(t => t.effects.some(e => e.is(setLoading)))) {
            this.decorations = buildDecos(update.view)
          }
        },
      }),
      { decorations: (v) => v.decorations },
    ),
    loadingState,
  ]
}
