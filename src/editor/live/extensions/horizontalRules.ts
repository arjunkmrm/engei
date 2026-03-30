import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const hrLine = Decoration.line({ class: "cm-live-hr" })

function buildHrDecos(state: EditorState): DecorationSet {
  const widgets: Range<Decoration>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "HorizontalRule") {
        const line = state.doc.lineAt(node.from)
        widgets.push(hrLine.range(line.from))
        return false
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function horizontalRules(): Extension {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildHrDecos(state)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildHrDecos(tr.state)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
