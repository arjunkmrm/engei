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

export interface SonoEditorProps {
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
  /** Display name for new comments */
  author?: string
  /** Extra CSS class on root */
  className?: string

  /** Content changed */
  onChange?: (content: string) => void
  /** New comment created — receives computed anchor */
  onAddComment?: (anchor: Anchor, body: string) => void
  /** Comment resolved/deleted */
  onDeleteComment?: (commentId: string) => void
  /** Reply added to thread */
  onAddReply?: (commentId: string, body: string) => void
  /** Comment focus changed */
  onActiveCommentChange?: (id: string | null) => void
  /** Internal link clicked (non-http, non-anchor) */
  onLinkClick?: (href: string) => void
}
