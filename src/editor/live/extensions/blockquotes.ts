import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const blockquoteMark = Decoration.mark({ class: "cm-live-blockquote" })

function buildBlockquoteDecos(
  state: EditorState,
  marker: Decoration,
): DecorationSet {
  const widgets: Range<Decoration>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "Blockquote") {
        widgets.push(blockquoteMark.range(node.from, node.to))
        return // process children for QuoteMark
      }
      if (node.name === "QuoteMark") {
        if (node.from < node.to) {
          widgets.push(marker.range(node.from, node.to))
        }
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function blockquotes(opts?: {
  markerClass?: string
}): Extension {
  const marker = Decoration.mark({ class: opts?.markerClass ?? "cm-live-marker" })

  return StateField.define<DecorationSet>({
    create(state) {
      return buildBlockquoteDecos(state, marker)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildBlockquoteDecos(tr.state, marker)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
