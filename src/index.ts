// Main component
export { default as Editor } from "./Editor"
export type { EditorHandle } from "./Editor"

// Workspace — batteries-included editor experience
export { default as Workspace } from "./Workspace"
export type { WorkspaceProps, WorkspaceFile, DataProvider, WorkspaceEventType, WorkspaceSwitcherConfig } from "./workspace-types"

// File tree
export { default as FileTree } from "./tree/FileTree"
export type { TreeFile, FileTreeProps } from "./tree/FileTree"
export { useFileTreeStore } from "./tree/store"

// Types
export type { Comment, Reply, Anchor, EditorProps, WidgetPlugin } from "./types"

// Pure utilities
export { createAnchor, resolveAnchor, resolveAnchors } from "./comments/anchoring"

// CM6 building blocks (for advanced consumers)
export { commentField, setComments, addComment, removeComment, getCommentRanges } from "./comments/CommentDecoration"

// Markdown utilities moved to lazy MarkdownPreview chunk.
// Import directly from "engei/preview" if needed.

// Widget system (re-exported from engei-widgets)
export {
  hydrateWidgets,
  buildWidgetRegistry,
  buildLangMap,
  getDefaultWidgets,
  chartPlugin,
  mermaidPlugin,
  diffPlugin,
  globePlugin,
  katexPlugin,
  tablePlugin,
  embedPlugin,
  sketchPlugin,
  mapPlugin,
  timelinePlugin,
  calendarPlugin,
  htmlPlugin,
} from "engei-widgets"
export type { WidgetSpec, WidgetHydrator } from "engei-widgets"

// Live editing extensions (composable CM6 extensions)
export { liveDefaults, headings, emphasis, strikethrough, tables, codeBlocks, images, widgetExtension, blockquotes, tasks, horizontalRules, listIndent, selectionOverlaps, cursorOnLine } from "./editor/live"

// Slash commands
export { slashCommands, slashCommandHandler } from "./editor/slash-commands"
export type { SlashCommandHandler } from "./editor/slash-commands"

// Styles — import "engei/styles" in your app
import "./styles/engei.css"
