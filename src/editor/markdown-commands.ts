/**
 * Markdown editing commands and keymap for engei.
 *
 * Combines CM6's built-in markdown commands (list continuation, smart backspace)
 * with custom formatting toggles (bold, italic, code, strikethrough).
 */

import { insertNewlineContinueMarkup, deleteMarkupBackward } from "@codemirror/lang-markdown"
import { slashEnter } from "./slash-commands"
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
      const cursorLine = state.doc.lineAt(head)
      const markLine = state.doc.lineAt(mark.from)

      // Check if this is an empty list item OR cursor is at the very start of content
      if (cursorLine.number === markLine.number) {
        const textAfterMark = state.doc.sliceString(mark.to, cursorLine.to).trim()
        const textBeforeCursor = state.doc.sliceString(mark.to, head).trim()
        const isEmpty = textAfterMark === ""
        const isAtContentStart = textBeforeCursor === "" && textAfterMark !== ""

        if (isEmpty || isAtContentStart) {
          // Empty or cursor-at-start — check if nested
          const listNode = listItemNode.parent
          const isNested = listNode?.parent?.name === "ListItem"

          if (isNested) {
            // Outdent: delete the current line, place cursor at the end of the
            // previous line, then call indentLess-style behavior by creating a
            // new list item at the parent level
            const parentListItem = listNode!.parent!
            const parentMark = parentListItem.getChild("ListMark")
            if (parentMark) {
              const parentMarkLine = state.doc.lineAt(parentMark.from)
              const parentWs = parentMarkLine.text.match(/^(\s*)/)?.[1] ?? ""

              // Determine marker type from parent
              const parentMarkText = state.doc.sliceString(parentMark.from, parentMark.to)
              const isOrdered = /\d+\./.test(parentMarkText)

              // Replace current line with outdented new item
              // Use "1." initially — we'll fix the number after dispatch
              // If cursor is at content start, carry the content along
              const newMark = isOrdered ? "1." : parentMarkText
              const trailingContent = isAtContentStart ? state.doc.sliceString(head, cursorLine.to) : ""
              const insert = parentWs + newMark + " " + trailingContent
              view.dispatch({
                changes: { from: cursorLine.from, to: cursorLine.to, insert },
                selection: { anchor: cursorLine.from + parentWs.length + newMark.length + 1 },
              })

              // Now renumber: count preceding siblings at this indent level
              if (isOrdered) {
                const newLine = view.state.doc.lineAt(view.state.selection.main.head)
                const match = newLine.text.match(/^(\s*)\d+(\.\s)/)
                if (match) {
                  const indent = match[1]
                  let count = 0
                  for (let ln = newLine.number - 1; ln >= 1; ln--) {
                    const prev = view.state.doc.line(ln)
                    const pm = prev.text.match(/^(\s*)\d+\.\s/)
                    if (pm && pm[1] === indent) {
                      count++
                    } else if (prev.text.trimStart().startsWith("-") || prev.text.trimStart().startsWith("*")) {
                      break
                    } else if (prev.text.trim() === "" || prev.text.match(/^\s+/)?.[0]?.length! > indent.length) {
                      continue // skip blank lines and more-indented lines
                    } else {
                      break
                    }
                  }
                  const newNum = String(count + 1)
                  const numStart = newLine.from + indent.length
                  const numEnd = numStart + match[0].length - indent.length - match[2].length
                  if (view.state.doc.sliceString(numStart, numEnd) !== newNum) {
                    view.dispatch({
                      changes: { from: numStart, to: numEnd, insert: newNum },
                    })
                  }
                }
              }
              return true
            }
          } else if (isEmpty || isAtContentStart) {
            // Top-level — exit list: strip the marker, keep any content
            const content = isAtContentStart ? state.doc.sliceString(head, cursorLine.to) : ""
            view.dispatch({
              changes: { from: cursorLine.from, to: cursorLine.to, insert: content },
              selection: { anchor: cursorLine.from },
            })
            return true
          }
        }
      }

      // Check if the current line is a continuation (no ListMark on this line)
      if (cursorLine.number !== markLine.number) {
        // We're on a continuation line — create a new sibling list item.
        const markLineText = markLine.text
        const leadingWs = markLineText.match(/^(\s*)/)?.[1] ?? ""
        const markText = state.doc.sliceString(mark.from, mark.to)
        const insert = "\n" + leadingWs + markText + " "

        view.dispatch({
          changes: { from: head, insert },
          selection: { anchor: head + insert.length },
        })
        // Renumber if ordered
        if (/\d+\./.test(markText)) {
          renumberOrderedItem(view)
        }
        return true
      }
    }
  }

  // Normal list line or not in a list — delegate to CM6
  return insertNewlineContinueMarkup(view)
}

// ─── Smart Tab (reset ordered list number on indent) ─────────

import { indentMore, indentLess } from "@codemirror/commands"

/**
 * Renumber an ordered list item to match its position among siblings.
 * Counts preceding ordered list items at the same indent level.
 */
function renumberOrderedItem(view: EditorView): void {
  const line = view.state.doc.lineAt(view.state.selection.main.head)
  const match = line.text.match(/^(\s*)\d+(\.\s)/)
  if (!match) return

  const indent = match[1]
  let count = 0

  for (let ln = line.number - 1; ln >= 1; ln--) {
    const prev = view.state.doc.line(ln)
    const pm = prev.text.match(/^(\s*)\d+\.\s/)
    if (pm && pm[1] === indent) {
      count++
    } else if (prev.text.trim() === "" || (prev.text.match(/^\s*/)?.[0]?.length ?? 0) > indent.length) {
      continue // skip blank lines and more-indented lines (nested content)
    } else {
      break
    }
  }

  const newNum = String(count + 1)
  const numStart = line.from + indent.length
  const numEnd = numStart + match[0].length - indent.length - match[2].length
  if (view.state.doc.sliceString(numStart, numEnd) !== newNum) {
    view.dispatch({
      changes: { from: numStart, to: numEnd, insert: newNum },
    })
  }
}

function smartTab(view: EditorView): boolean {
  const result = indentMore(view)
  if (result) renumberOrderedItem(view)
  return result
}

function smartShiftTab(view: EditorView): boolean {
  const result = indentLess(view)
  if (!result) return false
  renumberOrderedItem(view)
  return true
}

// ─── Typographic replacements ────────────────────────────────

const REPLACEMENTS: [string, string][] = [
  ["->", "→"],
  ["<-", "←"],
  ["=>", "⇒"],
  ["--", "—"],
  ["...", "…"],
]

/** Replace typographic sequences as the user types. */
export const typographicReplacements = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return
  // Only check user input (not programmatic changes)
  update.changes.iterChanges((_fromA, _toA, _fromB, toB, inserted) => {
    if (inserted.length === 0) return
    const insertedText = inserted.toString()
    // Only trigger on single-char inserts (typing)
    if (insertedText.length !== 1) return

    const doc = update.state.doc
    for (const [trigger, replacement] of REPLACEMENTS) {
      const lastChar = trigger[trigger.length - 1]
      if (insertedText !== lastChar) continue

      // Check if the characters before the cursor match the trigger prefix
      const triggerStart = toB - trigger.length
      if (triggerStart < 0) continue
      const candidate = doc.sliceString(triggerStart, toB)
      if (candidate !== trigger) continue

      // Don't replace inside code blocks or inline code
      // (simple heuristic: check if we're inside backticks)
      const lineBefore = doc.sliceString(doc.lineAt(toB).from, triggerStart)
      if ((lineBefore.split("`").length - 1) % 2 === 1) continue

      // Schedule replacement (can't dispatch during update listener synchronously)
      setTimeout(() => {
        update.view.dispatch({
          changes: { from: triggerStart, to: toB, insert: replacement },
        })
      }, 0)
      return
    }
  })
})

// ─── Keymap ───────────────────────────────────────────────────

export const markdownKeymap: KeyBinding[] = [
  { key: "Tab", run: smartTab },
  { key: "Shift-Tab", run: smartShiftTab },
  { key: "Enter", run: slashEnter },
  { key: "Enter", run: smartEnter },
  { key: "Shift-Enter", run: insertSoftNewline },
  { key: "Backspace", run: deleteMarkupBackward },
  { key: "Mod-b", run: toggleBold },
  { key: "Mod-i", run: toggleItalic },
  { key: "Mod-e", run: toggleCode },
  { key: "Mod-Shift-x", run: toggleStrikethrough },
]
