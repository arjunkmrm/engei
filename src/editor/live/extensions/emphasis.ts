import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const emphMark = Decoration.mark({ class: "cm-live-emphasis" })
const strongMark = Decoration.mark({ class: "cm-live-strong" })
const inlineCodeMark = Decoration.mark({ class: "cm-live-inline-code" })
const linkMark = Decoration.mark({ class: "cm-live-link" })

const STYLED_NODES: Record<string, Decoration> = {
  Emphasis: emphMark,
  StrongEmphasis: strongMark,
  InlineCode: inlineCodeMark,
  Link: linkMark,
}

const MARKER_TOKENS = new Set(["EmphasisMark", "CodeMark", "LinkMark", "URL"])

function buildEmphasisDecos(
  state: EditorState,
  marker: Decoration,
): DecorationSet {
  const widgets: Range<Decoration>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name in STYLED_NODES) {
        widgets.push(STYLED_NODES[node.name].range(node.from, node.to))
        return // process children for marker tokens
      }

      if (MARKER_TOKENS.has(node.name)) {
        if (node.from < node.to) {
          widgets.push(marker.range(node.from, node.to))
        }
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function emphasis(opts?: {
  markerClass?: string
}): Extension {
  const marker = Decoration.mark({ class: opts?.markerClass ?? "cm-live-marker" })

  return StateField.define<DecorationSet>({
    create(state) {
      return buildEmphasisDecos(state, marker)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildEmphasisDecos(tr.state, marker)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
