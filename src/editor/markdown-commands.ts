/**
 * Markdown editing commands and keymap for engei.
 *
 * Combines CM6's built-in markdown commands (list continuation, smart backspace)
 * with custom formatting toggles (bold, italic, code, strikethrough).
 */

import { insertNewlineContinueMarkup, deleteMarkupBackward } from "@codemirror/lang-markdown"
import { syntaxTree } from "@codemirror/language"
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

// ─── Soft continuation (Shift+Enter) ─────────────────────────

/**
 * Insert a continuation line inside a list item, indented to align
 * with the text content (past the list marker). If not inside a
 * list item, inserts a plain newline.
 *
 * Example:
 *   - Some text|        →  Shift+Enter  →  - Some text
 *     continuation here                      continuation here
 */
export function insertSoftNewline(view: EditorView): boolean {
  const state = view.state
  const { head } = state.selection.main

  const tree = syntaxTree(state)
  let listItem: { from: number; to: number } | null = null
  let listMarkEnd = -1

  // Walk up the tree from cursor to find enclosing ListItem + ListMark
  let node = tree.resolveInner(head, -1)
  while (node) {
    if (node.name === "ListItem") {
      listItem = { from: node.from, to: node.to }
      // Find ListMark child
      const mark = node.getChild("ListMark")
      if (mark) listMarkEnd = mark.to
      break
    }
    if (!node.parent) break
    node = node.parent
  }

  if (!listItem || listMarkEnd < 0) {
    // Not in a list — insert plain newline
    view.dispatch({
      changes: { from: head, insert: "\n" },
      selection: { anchor: head + 1 },
    })
    return true
  }

  // Calculate indent: the column where text starts after the list mark.
  // Uses spaces (not CSS) because the live editor uses a proportional font.
  const listItemLine = state.doc.lineAt(listItem.from)
  const lineStart = listItemLine.from
  const textStart = listMarkEnd + 1 // +1 for the space after the mark
  const indent = textStart - lineStart

  const newline = "\n" + " ".repeat(indent)
  view.dispatch({
    changes: { from: head, insert: newline },
    selection: { anchor: head + newline.length },
  })
  return true
}

// ─── Enter on continuation lines ─────────────────────────────

/**
 * Smart Enter for markdown lists. If the cursor is on a continuation
 * line (inside a ListItem but the current line has no ListMark),
 * create a new sibling list item instead of continuing indentation.
 * Otherwise, delegate to CM6's insertNewlineContinueMarkup.
 *
 * Sequence: `- foo` → Shift+Enter → `bar` → Enter → `- |`
 */
export function smartEnter(view: EditorView): boolean {
  const state = view.state
  const { head } = state.selection.main

  const tree = syntaxTree(state)
  let listItemNode: ReturnType<typeof tree.resolveInner> | null = null

  // Walk up from cursor to find enclosing ListItem
  let node = tree.resolveInner(head, -1)
  while (node) {
    if (node.name === "ListItem") {
      listItemNode = node
      break
    }
    if (!node.parent) break
    node = node.parent
  }

  if (listItemNode) {
    const mark = listItemNode.getChild("ListMark")
    if (mark) {
      // Check if the current line is a continuation (no ListMark on this line)
      const cursorLine = state.doc.lineAt(head)
      const markLine = state.doc.lineAt(mark.from)

      if (cursorLine.number !== markLine.number) {
        // We're on a continuation line — create a new sibling list item.
        // Use the same leading whitespace and marker as the parent ListItem.
        const markLineText = markLine.text
        const leadingWs = markLineText.match(/^(\s*)/)?.[1] ?? ""
        const markText = state.doc.sliceString(mark.from, mark.to)
        const insert = "\n" + leadingWs + markText + " "

        view.dispatch({
          changes: { from: head, insert },
          selection: { anchor: head + insert.length },
        })
        return true
      }
    }
  }

  // Normal list line or not in a list — delegate to CM6
  return insertNewlineContinueMarkup(view)
}

// ─── Keymap ───────────────────────────────────────────────────

export const markdownKeymap: KeyBinding[] = [
  { key: "Enter", run: smartEnter },
  { key: "Shift-Enter", run: insertSoftNewline },
  { key: "Backspace", run: deleteMarkupBackward },
  { key: "Mod-b", run: toggleBold },
  { key: "Mod-i", run: toggleItalic },
  { key: "Mod-e", run: toggleCode },
  { key: "Mod-Shift-x", run: toggleStrikethrough },
]
