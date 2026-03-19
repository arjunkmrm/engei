import type { WidgetHydrator } from "./widgets/registry"

export interface WidgetPlugin {
  /** Widget type identifier used in the spec's `type` field */
  type: string
  /** If set, fenced code blocks with this language become widget placeholders */
  codeBlockLang?: string
  /** Convert code block text into a partial spec object. If omitted, text is parsed as JSON. */
  toSpec?: (text: string, position?: number) => Record<string, any>
  /** Function that hydrates the widget into a DOM element */
  hydrate: WidgetHydrator
}

export interface Anchor {
  exact: string
  prefix: string
  suffix: string
  hint: number
}

export interface Reply {
  id: string
  body: string
  author: string
  createdAt: string
}

export interface Comment {
  id: string
  anchor: Anchor
  body: string
  author: string
  createdAt: string
  replies: Reply[]
}

export interface EditorProps {
  /** File content (controlled) */
  content: string
  /** Filename for language detection (e.g. "main.rs") */
  filename?: string
  /** Disable editing */
  readOnly?: boolean
  /** Source editor or rendered markdown */
  mode?: "source" | "preview"
  /** Comment data */
  comments?: Comment[]
  /** Currently focused comment */
  activeCommentId?: string | null
  /** Show/hide comment UI */
  commentsVisible?: boolean
  /** Theme */
  theme?: "dark" | "light"
  /** Extra CSS class on root */
  className?: string

  /** Content changed */
  onChange?: (content: string) => void
  /** New comment created from selection — receives computed anchor */
  onCreateComment?: (anchor: Anchor) => void
  /** Draft comment body submitted */
  onUpdateComment?: (commentId: string, body: string) => void
  /** Comment resolved/deleted */
  onDeleteComment?: (commentId: string) => void
  /** Reply added to thread */
  onAddReply?: (commentId: string, body: string) => void
  /** Comment focus changed */
  onActiveCommentChange?: (id: string | null) => void
  /** Internal link clicked (non-http, non-anchor) */
  onLinkClick?: (href: string) => void

  /** Widget plugins for markdown preview. Defaults to built-in chart, mermaid, diff. */
  widgets?: WidgetPlugin[]
}
