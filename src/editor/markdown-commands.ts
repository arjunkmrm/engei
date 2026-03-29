/**
 * Markdown editing commands and keymap for engei.
 *
 * Combines CM6's built-in markdown commands (list continuation, smart backspace)
 * with custom formatting toggles (bold, italic, code, strikethrough).
 */

import { insertNewlineContinueMarkup, deleteMarkupBackward } from "@codemirror/lang-markdown"
import type { KeyBinding } from "@codemirror/view"
import type { ChangeSpec } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

// ─── Toggle formatting helpers ────────────────────────────────

function toggleWrap(view: EditorView, marker: string): boolean {
  const state = view.state
  const changes: ChangeSpec[] = []
  let anyToggled = false

  for (const range of state.selection.ranges) {
    if (range.empty) {
      // No selection: insert marker pair with cursor between
      changes.push({ from: range.from, insert: marker + marker })
      anyToggled = true
    } else {
      const selected = state.sliceDoc(range.from, range.to)
      // Check if already wrapped — toggle off
      if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
        changes.push({ from: range.from, to: range.to, insert: selected.slice(marker.length, -marker.length) })
      } else {
        // Check if surrounding text has the marker — toggle off
        const before = state.sliceDoc(Math.max(0, range.from - marker.length), range.from)
        const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + marker.length))
        if (before === marker && after === marker) {
          changes.push(
            { from: range.from - marker.length, to: range.from, insert: "" },
            { from: range.to, to: range.to + marker.length, insert: "" },
          )
        } else {
          // Wrap selection
          changes.push({ from: range.from, insert: marker }, { from: range.to, insert: marker })
        }
      }
      anyToggled = true
    }
  }

  if (anyToggled) {
    view.dispatch({ changes })
    return true
  }
  return false
}

export const toggleBold = (view: EditorView) => toggleWrap(view, "**")
export const toggleItalic = (view: EditorView) => toggleWrap(view, "*")
export const toggleCode = (view: EditorView) => toggleWrap(view, "`")
export const toggleStrikethrough = (view: EditorView) => toggleWrap(view, "~~")

// ─── Keymap ───────────────────────────────────────────────────

export const markdownKeymap: KeyBinding[] = [
  { key: "Enter", run: insertNewlineContinueMarkup },
  { key: "Backspace", run: deleteMarkupBackward },
  { key: "Mod-b", run: toggleBold },
  { key: "Mod-i", run: toggleItalic },
  { key: "Mod-e", run: toggleCode },
  { key: "Mod-Shift-x", run: toggleStrikethrough },
]
