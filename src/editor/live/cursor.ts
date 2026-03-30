/**
 * Cursor/selection helpers shared across live editing extensions.
 */

import type { EditorState, SelectionRange } from "@codemirror/state"

/** Check if ANY selection range overlaps [from, to] */
export function selectionOverlaps(ranges: readonly SelectionRange[], from: number, to: number): boolean {
  for (const r of ranges) {
    if (r.from <= to && r.to >= from) return true
  }
  return false
}

/** Check if ANY cursor (collapsed selection) is on the same line as [from, to] */
export function cursorOnLine(state: EditorState, ranges: readonly SelectionRange[], from: number, to: number): boolean {
  const doc = state.doc
  const nodeStartLine = doc.lineAt(from).number
  const nodeEndLine = doc.lineAt(to).number
  for (const r of ranges) {
    if (r.empty) {
      const cursorLine = doc.lineAt(r.head).number
      if (cursorLine >= nodeStartLine && cursorLine <= nodeEndLine) return true
    } else {
      // Non-empty selection — check overlap
      if (r.from <= to && r.to >= from) return true
    }
  }
  return false
}
