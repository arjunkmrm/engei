import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView } from "@codemirror/view"
import { StateField, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const fencedCodeMark = Decoration.mark({ class: "cm-live-fenced-code" })
const fenceLineMark = Decoration.line({ class: "cm-live-fence-line" })
const codeContentLine = Decoration.line({ class: "cm-live-code-line" })
const codeFirstLine = Decoration.line({ class: "cm-live-code-line cm-live-code-first" })
const codeLastLine = Decoration.line({ class: "cm-live-code-line cm-live-code-last" })
const codeSingleLine = Decoration.line({ class: "cm-live-code-line cm-live-code-first cm-live-code-last" })

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

        // Only decorate complete fenced code blocks (opening + closing fence).
        // Incomplete blocks (user mid-typing) are left unstyled — auto-close
        // on Enter creates the closing fence instantly.
        // Skip incomplete blocks (no closing fence)
        if (node.node.getChildren("CodeMark").length < 2) return false

        widgets.push(fencedCodeMark.range(node.from, node.to))
        const doc = state.doc
        const startLine = doc.lineAt(node.from)
        const endLine = doc.lineAt(node.to)
        widgets.push(fenceLineMark.range(startLine.from))
        if (endLine.number !== startLine.number) {
          widgets.push(fenceLineMark.range(endLine.from))
        }

        // Add line decorations for all content lines (background on empty lines,
        // plus first/last padding and border-radius)
        const firstContentLineNum = startLine.number + 1
        const lastContentLineNum = endLine.number - 1
        for (let ln = firstContentLineNum; ln <= lastContentLineNum; ln++) {
          const lineFrom = doc.line(ln).from
          if (ln === firstContentLineNum && ln === lastContentLineNum) {
            widgets.push(codeSingleLine.range(lineFrom))
          } else if (ln === firstContentLineNum) {
            widgets.push(codeFirstLine.range(lineFrom))
          } else if (ln === lastContentLineNum) {
            widgets.push(codeLastLine.range(lineFrom))
          } else {
            widgets.push(codeContentLine.range(lineFrom))
          }
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
        if (syntaxTree(tr.startState) === syntaxTree(tr.state)) return prev
      } else if (syntaxTree(tr.startState) === syntaxTree(tr.state)) {
        // Doc changed but tree structure unchanged (e.g. typing inside a block) —
        // map positions instead of full rebuild
        return prev.map(tr.changes)
      }
      return buildCodeBlockDecos(tr.state, marker, widgetLangs)
    },
    provide: f => EditorView.decorations.from(f),
  })
}
