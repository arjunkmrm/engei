import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"
import { LiveImageType } from "../LiveImageType"
import { cursorOnLine } from "../cursor"

function buildImageDecos(
  state: EditorState,
  theme: "dark" | "light",
): DecorationSet {
  const widgets: Range<Decoration>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "Image") {
        if (!cursorOnLine(state, state.selection.ranges, node.from, node.to)) {
          const urlNode = node.node.getChild("URL")
          const src = urlNode ? state.doc.sliceString(urlNode.from, urlNode.to) : ""
          const full = state.doc.sliceString(node.from, node.to)
          const altMatch = full.match(/^!\[([^\]]*)\]/)
          const alt = altMatch ? altMatch[1] : ""
          if (src && node.from < node.to) {
            const imgDeco = Decoration.replace({
              widget: new LiveImageType(src, alt, theme),
              block: true,
            })
            widgets.push(imgDeco.range(node.from, node.to))
            return false
          }
        }
        return // let children handle normally
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function images(opts?: {
  theme?: "dark" | "light"
}): Extension {
  const theme = opts?.theme ?? "dark"

  return StateField.define<DecorationSet>({
    create(state) {
      return buildImageDecos(state, theme)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildImageDecos(tr.state, theme)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
