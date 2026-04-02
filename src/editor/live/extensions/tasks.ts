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

/** Find the TaskMarker node at or near a document position. */
function findTaskMarkerAt(state: EditorState, pos: number): { from: number; to: number; checked: boolean } | null {
  let result: { from: number; to: number; checked: boolean } | null = null
  const line = state.doc.lineAt(pos)
  syntaxTree(state).iterate({
    from: line.from,
    to: line.to,
    enter(node) {
      if (node.name === "TaskMarker") {
        const text = state.doc.sliceString(node.from, node.to)
        result = { from: node.from, to: node.to, checked: text.includes("x") || text.includes("X") }
      }
    },
  })
  return result
}

export function tasks(opts?: {
  markerClass?: string
}): Extension {
  const marker = Decoration.mark({ class: opts?.markerClass ?? "cm-live-marker" })

  const decoField = StateField.define<DecorationSet>({
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

  const clickHandler = EditorView.domEventHandlers({
    mousedown(event, view) {
      const target = event.target as HTMLElement
      if (!target.classList.contains("cm-live-task-checked") && !target.classList.contains("cm-live-task-unchecked")) return false
      const pos = view.posAtDOM(target)
      const marker = findTaskMarkerAt(view.state, pos)
      if (!marker) return false
      event.preventDefault()
      view.dispatch({
        changes: { from: marker.from, to: marker.to, insert: marker.checked ? "[ ]" : "[x]" },
      })
      return true
    },
  })

  return [decoField, clickHandler]
}
