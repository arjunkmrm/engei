import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import type { Extension, Range } from "@codemirror/state"

/**
 * Hanging indent for list item lines. Uses a ViewPlugin to measure
 * actual marker text width in pixels (DOM access), so alignment is
 * pixel-perfect even with proportional fonts.
 *
 * Marker lines get:    padding-left: Xpx; text-indent: -Xpx
 * (where X = measured width of "- " or "1. " etc.)
 */

/** Measure the pixel width of a string in the editor's font. */
function measureText(view: EditorView, text: string): number {
  const ruler = document.createElement("span")
  ruler.style.visibility = "hidden"
  ruler.style.position = "absolute"
  ruler.style.whiteSpace = "pre"
  ruler.textContent = text

  // Insert into .cm-content to inherit the correct font
  const content = view.contentDOM
  content.appendChild(ruler)
  const width = ruler.getBoundingClientRect().width
  content.removeChild(ruler)
  return width
}

function buildDecos(view: EditorView): DecorationSet {
  const state = view.state
  const decos: Range<Decoration>[] = []
  const seen = new Set<number>()

  // Cache measured widths per marker text (e.g., "- " → 11.4px)
  const widthCache = new Map<string, number>()

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "ListItem") return

      const mark = node.node.getChild("ListMark")
      if (!mark) return

      const markLine = state.doc.lineAt(mark.from)
      if (seen.has(markLine.from)) return
      seen.add(markLine.from)

      // The full prefix: leading whitespace + marker + space
      const prefix = state.doc.sliceString(markLine.from, mark.to + 1)
      let width = widthCache.get(prefix)
      if (width === undefined) {
        width = measureText(view, prefix)
        widthCache.set(prefix, width)
      }

      const px = Math.round(width * 100) / 100
      decos.push(Decoration.line({
        attributes: {
          style: `padding-left: ${px}px; text-indent: -${px}px`,
        },
      }).range(markLine.from))
    },
  })

  return Decoration.set(decos, true)
}

export function listIndent(): Extension {
  return ViewPlugin.define(
    (view) => ({
      decorations: buildDecos(view),
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecos(update.view)
        } else {
          const oldTree = syntaxTree(update.startState)
          const newTree = syntaxTree(update.state)
          if (oldTree !== newTree) {
            this.decorations = buildDecos(update.view)
          }
        }
      },
    }),
    { decorations: (v) => v.decorations },
  )
}
