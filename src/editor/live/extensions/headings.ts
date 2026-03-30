import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const headingMarks: Record<string, Decoration> = {
  ATXHeading1: Decoration.mark({ class: "cm-live-h1" }),
  ATXHeading2: Decoration.mark({ class: "cm-live-h2" }),
  ATXHeading3: Decoration.mark({ class: "cm-live-h3" }),
  ATXHeading4: Decoration.mark({ class: "cm-live-h4" }),
  ATXHeading5: Decoration.mark({ class: "cm-live-h5" }),
  ATXHeading6: Decoration.mark({ class: "cm-live-h6" }),
}

const headingLines: Record<string, Decoration> = {
  ATXHeading1: Decoration.line({ class: "cm-live-h1-line" }),
  ATXHeading2: Decoration.line({ class: "cm-live-h2-line" }),
  ATXHeading3: Decoration.line({ class: "cm-live-h3-line" }),
  ATXHeading4: Decoration.line({ class: "cm-live-h4-line" }),
  ATXHeading5: Decoration.line({ class: "cm-live-h5-line" }),
  ATXHeading6: Decoration.line({ class: "cm-live-h6-line" }),
}

function buildHeadingDecos(
  state: EditorState,
  marker: Decoration,
): DecorationSet {
  const widgets: Range<Decoration>[] = []
  const docLen = state.doc.length

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name in headingMarks) {
        widgets.push(headingMarks[node.name].range(node.from, node.to))
        const line = state.doc.lineAt(node.from)
        widgets.push(headingLines[node.name].range(line.from))
        return // process children for HeaderMark
      }

      if (node.name === "HeaderMark") {
        const end = Math.min(node.to + 1, docLen)
        if (end > node.from) {
          widgets.push(marker.range(node.from, end))
        }
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function headings(opts?: {
  markerClass?: string
}): Extension {
  const marker = Decoration.mark({ class: opts?.markerClass ?? "cm-live-marker" })

  return StateField.define<DecorationSet>({
    create(state) {
      return buildHeadingDecos(state, marker)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildHeadingDecos(tr.state, marker)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
