/**
 * Diff widget hydrator — renders side-by-side or inline code diffs.
 * Uses jsdiff for computation and highlight.js for syntax coloring.
 */

import { diffLines } from "diff"
import hljs from "highlight.js/lib/core"
import { registerWidget } from "./registry"

interface DiffWidgetSpec {
  type: "diff"
  widgetId: string
  language?: string
  old: string
  new: string
  filename?: string
}

function highlightLines(code: string, language?: string): string[] {
  let highlighted: string
  if (language && hljs.getLanguage(language)) {
    highlighted = hljs.highlight(code, { language }).value
  } else {
    highlighted = escapeHtml(code)
  }
  // Split on newlines, preserving HTML spans across lines
  return splitHighlightedLines(highlighted)
}

/**
 * Split highlighted HTML into lines while preserving open span tags.
 * When a span is open at a line break, close it and reopen on the next line.
 */
function splitHighlightedLines(html: string): string[] {
  const rawLines = html.split("\n")
  const result: string[] = []
  let openTags: string[] = []

  for (const raw of rawLines) {
    // Prepend any open tags from previous line
    let line = openTags.join("") + raw

    // Track open/close tags to carry state across lines
    const tagRe = /<\/?span[^>]*>/g
    let m
    while ((m = tagRe.exec(raw)) !== null) {
      if (m[0].startsWith("</")) {
        openTags.pop()
      } else {
        openTags.push(m[0])
      }
    }

    // Close any still-open tags at end of this line
    for (let i = openTags.length - 1; i >= 0; i--) {
      line += "</span>"
    }

    result.push(line)
  }

  return result
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

registerWidget("diff", (container, spec, _theme) => {
  const s = spec as DiffWidgetSpec
  if (s.old == null || s.new == null) {
    container.textContent = "Diff widget requires 'old' and 'new' fields"
    return
  }

  const oldText = s.old
  const newText = s.new

  // Compute diff
  const changes = diffLines(oldText, newText)

  // Highlight full files, then map lines into diff
  const oldLines = highlightLines(oldText, s.language)
  const newLines = highlightLines(newText, s.language)

  // Build diff rows — use a single "display line number" that tracks the final file
  const rows: { type: "equal" | "add" | "remove"; lineNum: number; html: string }[] = []
  let oldIdx = 0
  let newIdx = 0
  let added = 0
  let removed = 0

  for (const change of changes) {
    const count = change.count || 0
    if (change.removed) {
      for (let i = 0; i < count; i++) {
        rows.push({ type: "remove", lineNum: oldIdx + 1, html: oldLines[oldIdx] || "" })
        oldIdx++
        removed++
      }
    } else if (change.added) {
      for (let i = 0; i < count; i++) {
        rows.push({ type: "add", lineNum: newIdx + 1, html: newLines[newIdx] || "" })
        newIdx++
        added++
      }
    } else {
      for (let i = 0; i < count; i++) {
        rows.push({ type: "equal", lineNum: newIdx + 1, html: newLines[newIdx] || "" })
        oldIdx++
        newIdx++
      }
    }
  }

  // Render
  const wrapper = document.createElement("div")
  wrapper.className = "sono-diff-widget"

  // Optional filename header
  if (s.filename) {
    const header = document.createElement("div")
    header.className = "sono-diff-header"
    header.textContent = s.filename
    wrapper.appendChild(header)
  }

  // Summary line
  const summary = document.createElement("div")
  summary.className = "sono-diff-summary"
  const parts: string[] = []
  if (added > 0) parts.push(`Added ${added} line${added !== 1 ? "s" : ""}`)
  if (removed > 0) parts.push(`removed ${removed} line${removed !== 1 ? "s" : ""}`)
  summary.textContent = parts.length > 0 ? parts.join(", ") : "No changes"
  wrapper.appendChild(summary)

  const table = document.createElement("table")
  table.className = "sono-diff-table"

  for (const row of rows) {
    if (row.type === "equal") continue
    const tr = document.createElement("tr")
    tr.className = `sono-diff-row sono-diff-${row.type}`

    // Line number
    const numTd = document.createElement("td")
    numTd.className = "sono-diff-num"
    numTd.textContent = String(row.lineNum)
    tr.appendChild(numTd)

    // Prefix (+/-/space)
    const prefixTd = document.createElement("td")
    prefixTd.className = "sono-diff-prefix"
    prefixTd.textContent = row.type === "add" ? "+" : row.type === "remove" ? "\u2212" : ""
    tr.appendChild(prefixTd)

    // Code content
    const codeTd = document.createElement("td")
    codeTd.className = "sono-diff-code"
    codeTd.innerHTML = row.html || "&nbsp;"
    tr.appendChild(codeTd)

    table.appendChild(tr)
  }

  wrapper.appendChild(table)
  container.innerHTML = ""
  container.appendChild(wrapper)
})
