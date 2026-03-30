import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const fencedCodeMark = Decoration.mark({ class: "cm-live-fenced-code" })
const fenceLineMark = Decoration.line({ class: "cm-live-fence-line" })

function buildCodeBlockDecos(
  state: EditorState,
  marker: Decoration,
  widgetLangs?: Set<string>,
): DecorationSet {
  const widgets: Range<Decoration>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "FencedCode") {
        // Skip widget code blocks — handled by the widgets extension
        if (widgetLangs) {
          const codeInfoNode = node.node.getChild("CodeInfo")
          if (codeInfoNode) {
            const lang = state.doc.sliceString(codeInfoNode.from, codeInfoNode.to).trim().toLowerCase()
            if (widgetLangs.has(lang)) return false
          }
        }

        widgets.push(fencedCodeMark.range(node.from, node.to))
        const doc = state.doc
        const startLine = doc.lineAt(node.from)
        const endLine = doc.lineAt(node.to)
        widgets.push(fenceLineMark.range(startLine.from))
        if (endLine.number !== startLine.number) {
          widgets.push(fenceLineMark.range(endLine.from))
        }

        // Hide CodeInfo (language label)
        const codeInfoNode = node.node.getChild("CodeInfo")
        if (codeInfoNode && codeInfoNode.from < codeInfoNode.to) {
          widgets.push(marker.range(codeInfoNode.from, codeInfoNode.to))
        }

        return false // skip children
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function codeBlocks(opts?: {
  markerClass?: string
  widgetLangs?: Set<string>
}): Extension {
  const marker = Decoration.mark({ class: opts?.markerClass ?? "cm-live-marker" })
  const widgetLangs = opts?.widgetLangs

  return StateField.define<DecorationSet>({
    create(state) {
      return buildCodeBlockDecos(state, marker, widgetLangs)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildCodeBlockDecos(tr.state, marker, widgetLangs)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
