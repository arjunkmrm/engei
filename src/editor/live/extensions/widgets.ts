import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { Annotation, StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"
import type { WidgetPlugin } from "@engei/bonsai"
import { LiveWidgetType } from "../LiveWidgetType"

/** Annotation to tag save-back transactions from widgets, so we skip rebuilding decorations. */
export const widgetSaveBack = Annotation.define<boolean>()

function buildWidgetDecos(
  state: EditorState,
  widgetLangs: Map<string, WidgetPlugin>,
  theme: "dark" | "light",
): DecorationSet {
  const widgets: Range<Decoration>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "FencedCode") {
        const codeInfoNode = node.node.getChild("CodeInfo")
        if (codeInfoNode) {
          const lang = state.doc.sliceString(codeInfoNode.from, codeInfoNode.to).trim().toLowerCase()
          const plugin = widgetLangs.get(lang)
          if (plugin) {
            const codeTextNode = node.node.getChild("CodeText")
            const code = codeTextNode
              ? state.doc.sliceString(codeTextNode.from, codeTextNode.to).trim()
              : ""
            if (code && node.from < node.to) {
              const widgetDeco = Decoration.replace({
                widget: new LiveWidgetType(plugin, code, theme, node.from),
                block: true,
              })
              widgets.push(widgetDeco.range(node.from, node.to))
              return false
            }
          }
        }
        return false // not a widget — skip (codeBlocks extension handles regular code)
      }
    },
  })

  return Decoration.set(widgets, true)
}

export function widgets(plugins: WidgetPlugin[], opts?: {
  theme?: "dark" | "light"
}): Extension {
  const theme = opts?.theme ?? "dark"
  const widgetLangs = new Map(
    plugins.filter(p => p.codeBlockLang).map(p => [p.codeBlockLang!, p])
  )

  return StateField.define<DecorationSet>({
    create(state) {
      return buildWidgetDecos(state, widgetLangs, theme)
    },
    update(prev, tr) {
      // Save-back from a widget — adjust positions but don't rebuild (prevents feedback loop)
      if (tr.annotation(widgetSaveBack)) return prev.map(tr.changes)
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildWidgetDecos(tr.state, widgetLangs, theme)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
