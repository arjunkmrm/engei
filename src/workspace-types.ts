import type { Anchor, Comment, WidgetPlugin } from "./types"

export interface WorkspaceFile {
  id: string
  path: string
  content: string
  comments: Comment[]
}

export interface DataProvider {
  createComment: (fileId: string, anchor: Anchor, body: string) => Promise<{ id: string }>
  deleteComment: (fileId: string, commentId: string) => Promise<void>
  addReply: (fileId: string, commentId: string, body: string) => Promise<{ id: string }>
  updateFile?: (fileId: string, content: string) => Promise<void>
}

export type WorkspaceEventType =
  | { type: "comment:created"; fileId: string; comment: Comment }
  | { type: "comment:deleted"; fileId: string; commentId: string }
  | { type: "reply:created"; fileId: string; commentId: string; reply: Comment["replies"][0] }
  | { type: "file:updated"; fileId: string; content: string }
  | { type: "file:created"; fileId: string; path: string; content: string }
  | { type: "file:deleted"; fileId: string }
  | { type: "reload" }

export interface WorkspaceSwitcherConfig {
  /** Available workspaces */
  items: { id: string; name: string }[]
  /** Currently active workspace ID */
  activeId: string
  /** Called when user selects a workspace */
  onSwitch: (id: string) => void
  /** Called when user creates a new workspace (omit to hide "new" option) */
  onCreate?: (name: string) => void
}

export interface WorkspaceProps {
  /** Files to display */
  files: WorkspaceFile[]
  /** Explicit empty folder paths (folders with no files) */
  folders?: string[]
  /** Folder/project title for breadcrumb root */
  title?: string
  /** Disable editing */
  readOnly?: boolean
  /** Show existing comments but hide inputs */
  commentsLocked?: boolean

  /** Data persistence callbacks */
  data: DataProvider

  /** Currently active file path */
  activePath?: string | null
  /** Called when user navigates to a file */
  onNavigate?: (path: string | null) => void

  /** Subscribe to external real-time events (WebSocket, Tauri events, etc.) */
  onExternalEvent?: (handler: (event: WorkspaceEventType) => void) => (() => void)

  /** Theme */
  theme?: "dark" | "light"
  /** Called when user toggles theme */
  onThemeChange?: (theme: "dark" | "light") => void

  /** Extra elements in the header (share button, app-specific actions) */
  headerExtra?: React.ReactNode
  /** Extra elements at the top of the sidebar (back button, etc.) */
  sidebarExtra?: React.ReactNode
  /** Workspace switcher — if provided, renders a dropdown at the top of the sidebar */
  workspaces?: WorkspaceSwitcherConfig
  /** Called when user clicks the "+" button to create a new file. Optional folderPath for context-menu "New File" inside a folder. */
  onCreateFile?: (folderPath?: string) => void
  /** Called when user clicks the folder "+" button to create a new folder */
  onCreateFolder?: () => void
  /** Called when user renames a folder from the context menu */
  onRenameFolder?: (oldPath: string, newPath: string) => void
  /** Called when user deletes a folder from the context menu */
  onDeleteFolder?: (path: string) => void
  /** Called when user renames a file from the context menu */
  onRenameFile?: (fileId: string, newPath: string) => void
  /** Called when user drags a file onto a folder (or workspace root) */
  onMoveFile?: (fileId: string, newPath: string) => void
  /** Called when user deletes a file from the context menu */
  onDeleteFile?: (fileId: string) => void
  /** Content to show when no file is selected */
  emptyState?: React.ReactNode
  /** Root name in breadcrumb (e.g. folder slug) */
  rootName?: string
  /** Slash command handler: /prompt → LLM → widget markdown */
  onSlashCommand?: (prompt: string, context: string) => Promise<string>
  /** Widget plugins for markdown preview */
  widgets?: WidgetPlugin[]
  /** Default mode for markdown files: "preview" (read-only), "live" (WYSIWYG), "source" (raw) */
  markdownMode?: "source" | "preview" | "live"
  /** Save behavior: "auto" calls updateFile on every keystroke (default), "manual" only on Cmd/Ctrl+S */
  saveMode?: "auto" | "manual"
}
