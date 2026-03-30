import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view"
import type { DecorationSet } from "@codemirror/view"
import type { Extension, Range, EditorState } from "@codemirror/state"

/**
 * List indent: hanging indent + vertical indent guides.
 *
 * ViewPlugin measures actual marker widths in px for proportional fonts.
 * Indent guides are subtle vertical lines drawn via box-shadow at each
 * ancestor list item's marker position.
 */

function measureText(view: EditorView, text: string): number {
  const ruler = document.createElement("span")
  ruler.style.visibility = "hidden"
  ruler.style.position = "absolute"
  ruler.style.whiteSpace = "pre"
  ruler.textContent = text
  const content = view.contentDOM
  content.appendChild(ruler)
  const width = ruler.getBoundingClientRect().width
  content.removeChild(ruler)
  return width
}

interface MarkerInfo {
  from: number         // ListItem start
  to: number           // ListItem end
  markLineFrom: number // line.from of the marker line
  guidePx: number      // x-position for the vertical guide (leading ws width + small offset)
  prefixPx: number     // full prefix width for hanging indent
}

function collectMarkers(view: EditorView, state: EditorState): MarkerInfo[] {
  const markers: MarkerInfo[] = []
  const widthCache = new Map<string, number>()

  const measure = (text: string) => {
    let w = widthCache.get(text)
    if (w === undefined) {
      w = measureText(view, text)
      widthCache.set(text, w)
    }
    return w
  }

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "ListItem") return
      const mark = node.node.getChild("ListMark")
      if (!mark) return

      const markLine = state.doc.lineAt(mark.from)
      const prefix = state.doc.sliceString(markLine.from, mark.to + 1)
      const prefixPx = measure(prefix)

      // Guide position: at the leading whitespace + small offset into the marker
      const leadingWs = state.doc.sliceString(markLine.from, mark.from)
      const guidePx = leadingWs.length > 0 ? measure(leadingWs) + 4 : 4

      markers.push({
        from: node.from,
        to: node.to,
        markLineFrom: markLine.from,
        guidePx: Math.round(guidePx * 100) / 100,
        prefixPx: Math.round(prefixPx * 100) / 100,
      })
    },
  })

  return markers
}

function buildDecos(view: EditorView): DecorationSet {
  const state = view.state
  const markers = collectMarkers(view, state)
  const decos: Range<Decoration>[] = []

  // For each line, collect: which ListItem's marker line it is (for hanging indent),
  // and which ancestor guides it should show.
  const lineHangingIndent = new Map<number, number>() // lineFrom → prefixPx
  const lineGuides = new Map<number, Set<number>>()   // lineFrom → set of guide x positions

  for (const item of markers) {
    // Register hanging indent for the marker line
    if (!lineHangingIndent.has(item.markLineFrom)) {
      lineHangingIndent.set(item.markLineFrom, item.prefixPx)
    }

    // Find ancestors and collect their guide positions
    const ancestorGuidePositions: number[] = []
    for (const other of markers) {
      if (other === item) continue
      if (other.from <= item.from && other.to >= item.to) {
        ancestorGuidePositions.push(other.guidePx)
      }
    }

    if (ancestorGuidePositions.length === 0) continue

    // Apply ancestor guides to ALL lines in this item's range
    const startLine = state.doc.lineAt(item.from)
    const endLine = state.doc.lineAt(item.to)
    for (let ln = startLine.number; ln <= endLine.number; ln++) {
      const line = state.doc.line(ln)
      let guides = lineGuides.get(line.from)
      if (!guides) {
        guides = new Set()
        lineGuides.set(line.from, guides)
      }
      for (const g of ancestorGuidePositions) guides.add(g)
    }
  }

  // Build decorations from collected data
  const allLines = new Set([...lineHangingIndent.keys(), ...lineGuides.keys()])
  for (const lineFrom of allLines) {
    let style = ""

    const indent = lineHangingIndent.get(lineFrom)
    if (indent !== undefined) {
      style += `padding-left: ${indent}px; text-indent: -${indent}px;`
    }

    const guides = lineGuides.get(lineFrom)
    if (guides && guides.size > 0) {
      const color = "var(--indent-guide, rgba(255,255,255,0.08))"
      const gradients = [...guides]
        .sort((a, b) => a - b)
        .map(x => `linear-gradient(${color}, ${color}) no-repeat ${x}px 0 / 1px 100%`)
        .join(", ")
      style += ` background: ${gradients};`
    }

    if (style) {
      decos.push(Decoration.line({
        attributes: { style: style.trim() },
      }).range(lineFrom))
    }
  }

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
