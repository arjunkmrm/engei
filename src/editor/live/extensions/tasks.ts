import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const taskCheckedMark = Decoration.mark({ class: "cm-live-task-checked" })
const taskUncheckedMark = Decoration.mark({ class: "cm-live-task-unchecked" })

function buildTaskDecos(
  state: EditorState,
  marker: Decoration,
): DecorationSet {
  const widgets: Range<Decoration>[] = []
  const docLen = state.doc.length

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "Task") {
        const listItem = node.node.parent
        if (listItem) {
          const listMark = listItem.getChild("ListMark")
          if (listMark && listMark.from < listMark.to) {
            const end = Math.min(listMark.to + 1, docLen)
            widgets.push(marker.range(listMark.from, end))
          }
        }
        return // process children for TaskMarker
      }
      if (node.name === "TaskMarker") {
        const text = state.doc.sliceString(node.from, node.to)
        const checked = text.includes("x") || text.includes("X")
        widgets.push((checked ? taskCheckedMark : taskUncheckedMark).range(node.from, node.to))
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function tasks(opts?: {
  markerClass?: string
}): Extension {
  const marker = Decoration.mark({ class: opts?.markerClass ?? "cm-live-marker" })

  return StateField.define<DecorationSet>({
    create(state) {
      return buildTaskDecos(state, marker)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildTaskDecos(tr.state, marker)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
