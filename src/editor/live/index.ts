/**
 * Live editing extensions for CodeMirror 6.
 *
 * Each extension handles one markdown formatting concern and provides
 * decorations to the EditorView.decorations facet independently.
 * CM6 composites all decoration sets automatically.
 */

import type { Extension } from "@codemirror/state"
import type { WidgetPlugin } from "engei-widgets"

import { headings } from "./extensions/headings"
import { emphasis } from "./extensions/emphasis"
import { strikethrough } from "./extensions/strikethrough"
import { tables } from "./extensions/tables"
import { codeBlocks } from "./extensions/codeBlocks"
import { images } from "./extensions/images"
import { widgets as widgetExtension } from "./extensions/widgets"
import { blockquotes } from "./extensions/blockquotes"
import { tasks } from "./extensions/tasks"
import { horizontalRules } from "./extensions/horizontalRules"
import { listIndent } from "./extensions/listIndent"

/** Bundle all live editing extensions with shared defaults. */
export function liveDefaults(opts?: {
  theme?: "dark" | "light"
  widgets?: WidgetPlugin[]
  markerClass?: string
}): Extension[] {
  const theme = opts?.theme ?? "dark"
  const mc = opts?.markerClass

  // Build widget lang set so codeBlocks can skip them
  const widgetLangs = opts?.widgets
    ? new Set(opts.widgets.filter(p => p.codeBlockLang).map(p => p.codeBlockLang!))
    : undefined

  return [
    headings(mc ? { markerClass: mc } : undefined),
    emphasis(mc ? { markerClass: mc } : undefined),
    strikethrough(mc ? { markerClass: mc } : undefined),
    tables(),
    codeBlocks({ markerClass: mc, widgetLangs }),
    images({ theme }),
    ...(opts?.widgets ? [widgetExtension(opts.widgets, { theme })] : []),
    blockquotes(mc ? { markerClass: mc } : undefined),
    tasks(mc ? { markerClass: mc } : undefined),
    horizontalRules(),
    listIndent(),
  ]
}

// Re-export all extension factories
export { headings } from "./extensions/headings"
export { emphasis } from "./extensions/emphasis"
export { strikethrough } from "./extensions/strikethrough"
export { tables } from "./extensions/tables"
export { codeBlocks } from "./extensions/codeBlocks"
export { images } from "./extensions/images"
export { widgets as widgetExtension } from "./extensions/widgets"
export { blockquotes } from "./extensions/blockquotes"
export { tasks } from "./extensions/tasks"
export { horizontalRules } from "./extensions/horizontalRules"
export { listIndent } from "./extensions/listIndent"

// Re-export cursor utilities for custom extension authors
export { selectionOverlaps, cursorOnLine } from "./cursor"
