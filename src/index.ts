// Main component
export { default as Editor } from "./Editor"
export type { EditorHandle } from "./Editor"

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

// Markdown utilities (for custom preview consumers)
export { parseWithPositions, domRangeToSourceRange, wrapSourceRange, clearHighlights } from "./preview/markedPositions"

// Widget system
export { hydrateWidgets, buildWidgetRegistry, buildLangMap, getDefaultWidgets } from "./widgets/registry"
export type { WidgetSpec, WidgetHydrator } from "./widgets/registry"

// Built-in widget plugins (pure objects — no side effects)
export { chartPlugin } from "./widgets/ChartWidget"
export { mermaidPlugin } from "./widgets/MermaidWidget"
export { diffPlugin } from "./widgets/DiffWidget"
export { globePlugin } from "./widgets/GlobeWidget"

// Styles — import "koen/styles" in your app
import "./styles/koen.css"
