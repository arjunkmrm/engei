import { syntaxTree } from "@codemirror/language"
import { Decoration, EditorView, BlockWrapper } from "@codemirror/view"
import { StateField, RangeSet, type Extension, type Range, type EditorState } from "@codemirror/state"
import type { DecorationSet } from "@codemirror/view"

const tableWrapper = BlockWrapper.create({ tagName: "div", attributes: { class: "cm-md-table" } })
const tableHeaderLine = Decoration.line({ class: "cm-table-header" })
const tableRowLine = Decoration.line({ class: "cm-table-row" })
const tableDelimiterLine = Decoration.line({ class: "cm-table-delimiter" })
const tablePipeMark = Decoration.mark({ class: "cm-table-pipe" })
const tableCellMark = Decoration.mark({ class: "cm-table-cell" })

interface TableState {
  decorations: DecorationSet
  wrappers: RangeSet<BlockWrapper>
}

function buildTableDecos(state: EditorState): TableState {
  const widgets: Range<Decoration>[] = []
  const wrapperRanges: Range<BlockWrapper>[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "Table") {
        wrapperRanges.push(tableWrapper.range(node.from, node.to))
        return // process children
      }

      if (node.name === "TableHeader" || node.name === "TableRow") {
        const line = state.doc.lineAt(node.from)
        widgets.push((node.name === "TableHeader" ? tableHeaderLine : tableRowLine).range(line.from))

        // Detect empty cells
        let lastDelimEnd = -1
        const cursor = node.node.cursor()
        if (cursor.firstChild()) {
          do {
            if (cursor.name === "TableDelimiter") {
              if (lastDelimEnd >= 0) {
                const gap = state.doc.sliceString(lastDelimEnd, cursor.from)
                if (gap.trim() === "" && cursor.from > lastDelimEnd) {
                  widgets.push(tableCellMark.range(lastDelimEnd, cursor.from))
                }
              }
              lastDelimEnd = cursor.to
            } else if (cursor.name === "TableCell") {
              lastDelimEnd = -1
            }
          } while (cursor.nextSibling())
        }

        return // process children
      }

      if (node.name === "TableCell") {
        if (node.from < node.to) {
          widgets.push(tableCellMark.range(node.from, node.to))
        }
      }

      if (node.name === "TableDelimiter") {
        const line = state.doc.lineAt(node.from)
        if (/^[\s|:-]+$/.test(line.text)) {
          widgets.push(tableDelimiterLine.range(line.from))
        } else if (node.from < node.to) {
          widgets.push(tablePipeMark.range(node.from, node.to))
        }
      }
    },
  })

  return {
    decorations: Decoration.set(widgets, true),
    wrappers: BlockWrapper.set(wrapperRanges, true),
  }
}

export function tables(): Extension {
  return StateField.define<TableState>({
    create(state) {
      return buildTableDecos(state)
    },
    update(prev, tr) {
      if (!tr.docChanged) {
        const oldTree = syntaxTree(tr.startState)
        const newTree = syntaxTree(tr.state)
        if (oldTree === newTree) return prev
      }
      return buildTableDecos(tr.state)
    },
    provide: f => [
      EditorView.decorations.from(f, v => v.decorations),
      EditorView.blockWrappers.from(f, v => v.wrappers),
    ],
  })
}
