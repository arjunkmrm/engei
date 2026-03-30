/**
 * Workspace — full editor experience with sidebar, file tree, comments.
 *
 * This is the "batteries-included" component. Consumers provide a DataProvider
 * for persistence and get the full editing UI for free.
 *
 * For lower-level control, use Editor + FileTree directly.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import Editor from "./Editor"
import FileTree from "./tree/FileTree"
import { useFileTreeStore } from "./tree/store"
import { getDefaultWidgets } from "engei-widgets"
import type { Anchor, Comment } from "./types"
import type { TreeFile } from "./tree/FileTree"
import type { WorkspaceProps, WorkspaceFile, WorkspaceEventType, WorkspaceSwitcherConfig } from "./workspace-types"

const defaultWidgets = getDefaultWidgets()

// ─── Icons ──────────────────────────────────────────────────

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.75 3.75l1.06 1.06M11.19 11.19l1.06 1.06M12.25 3.75l-1.06 1.06M4.81 11.19l-1.06 1.06" />
  </svg>
)

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 8.5a5.5 5.5 0 01-7-7 5.5 5.5 0 107 7z" />
  </svg>
)

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const FolderPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 10v6" /><path d="M9 13h6" />
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
)

const CollapseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 20 5-5 5 5" /><path d="m7 4 5 5 5-5" />
  </svg>
)

const SidebarCloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8H4M4 8l4-4M4 8l4 4" />
  </svg>
)

const MenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 4h12M2 8h12M2 12h12" />
  </svg>
)

// ─── Component ──────────────────────────────────────────────

// ─── Dialog ─────────────────────────────────────────────────

function Dialog({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div className="engei-dialog-backdrop" onMouseDown={onClose}>
      <div className="engei-dialog" onMouseDown={e => e.stopPropagation()}>
        <div className="engei-dialog-title">{title}</div>
        {children}
      </div>
    </div>
  )
}

// ─── Workspace Switcher ──────────────────────────────────────

function WorkspaceSwitcher({ items, activeId, onSwitch, onCreate, onRequestCreate }: WorkspaceSwitcherConfig & { onRequestCreate?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const activeName = items.find(ws => ws.id === activeId)?.name ?? "Workspace"

  return (
    <div className="engei-workspace-switcher" ref={ref} style={{ position: "relative" }}>
      <button
        className="engei-ws-trigger"
        onClick={() => setOpen(!open)}
      >
        <span className="koen-tree-label">{activeName}</span>
        <svg className={`engei-ws-chevron ${open ? "open" : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className="engei-ws-popover">
          {items.map(ws => (
            <button
              key={ws.id}
              className={`engei-ws-item ${ws.id === activeId ? "active" : ""}`}
              onClick={() => { onSwitch(ws.id); setOpen(false) }}
            >
              {ws.name}
              {ws.id === activeId && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
          {onCreate && (
            <>
              <div className="engei-ws-divider" />
              <button className="engei-ws-item create" onClick={() => { setOpen(false); onRequestCreate?.() }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New workspace
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────

export default function Workspace({
  files,
  folders,
  title,
  readOnly = false,
  commentsLocked = false,
  data,
  activePath = null,
  onNavigate,
  onExternalEvent,
  theme: controlledTheme,
  onThemeChange,
  headerExtra,
  sidebarExtra,
  emptyState,
  rootName = "workspace",
  markdownMode = "preview",
  widgets = defaultWidgets,
  saveMode = "auto",
  workspaces,
  onCreateFile,
  onCreateFolder,
  onRenameFolder,
  onRenameFile,
  onDeleteFile,
}: WorkspaceProps) {
  const [internalFiles, setInternalFiles] = useState<WorkspaceFile[]>(files)
  const [sidebarOpen, setSidebarOpen] = useState(typeof window !== "undefined" ? window.innerWidth > 640 : true)
  const [copied, setCopied] = useState(false)
  const [showCreateWs, setShowCreateWs] = useState(false)
  const [newWsName, setNewWsName] = useState("")

  // Use controlled theme or internal
  const [internalTheme, setInternalTheme] = useState<"dark" | "light">(controlledTheme || "dark")
  const theme = controlledTheme || internalTheme
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    if (onThemeChange) onThemeChange(next)
    else setInternalTheme(next)
  }

  // Sync files from props
  useEffect(() => { setInternalFiles(files) }, [files])

  // Sync theme CSS variables
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.style.setProperty("--editor-bg", "#1a1816")
      root.style.setProperty("--editor-fg", "#e8e6e3")
      root.style.setProperty("--widget-border", "#333")
      root.style.setProperty("--sidebar-bg", "#1a1816")
      root.style.setProperty("--code-block-bg", "#161412")
      root.style.setProperty("--fern-cmd-color", "rgba(130, 230, 130, 0.8)")
    } else {
      root.style.setProperty("--editor-bg", "#faf8f5")
      root.style.setProperty("--editor-fg", "#37352f")
      root.style.setProperty("--widget-border", "#e0ddd6")
      root.style.setProperty("--sidebar-bg", "#f5f3ef")
      root.style.setProperty("--code-block-bg", "#f2f0eb")
      root.style.setProperty("--fern-cmd-color", "#3a7a2a")
    }
    root.style.background = root.style.getPropertyValue("--editor-bg")
    root.style.color = root.style.getPropertyValue("--editor-fg")
  }, [theme])

  // Subscribe to external events (WebSocket, Tauri events, etc.)
  useEffect(() => {
    if (!onExternalEvent) return
    const handler = (event: WorkspaceEventType) => {
      if (event.type === "reload") return // consumer handles reload
      setInternalFiles(prev => {
        switch (event.type) {
          case "comment:created": {
            const file = prev.find(f => f.id === event.fileId)
            if (!file) return prev
            if (file.comments.some(c => c.id === event.comment.id)) return prev
            const tempIdx = file.comments.findIndex(c => c.id.startsWith("temp-") && c.body === event.comment.body)
            if (tempIdx !== -1) {
              return prev.map(f =>
                f.id === event.fileId
                  ? { ...f, comments: f.comments.map((c, i) => i === tempIdx ? event.comment : c) }
                  : f
              )
            }
            return prev.map(f =>
              f.id === event.fileId ? { ...f, comments: [...f.comments, event.comment] } : f
            )
          }
          case "comment:deleted":
            return prev.map(f => ({
              ...f,
              comments: f.comments.filter(c => c.id !== event.commentId),
            }))
          case "reply:created":
            return prev.map(f => ({
              ...f,
              comments: f.comments.map(c => {
                if (c.id !== event.commentId) return c
                if (c.replies.some(r => r.id === event.reply.id)) return c
                const tempIdx = c.replies.findIndex(r => r.id.startsWith("temp-") && r.body === event.reply.body)
                if (tempIdx !== -1) {
                  const updated = [...c.replies]
                  updated[tempIdx] = event.reply
                  return { ...c, replies: updated }
                }
                return { ...c, replies: [...c.replies, event.reply] }
              }),
            }))
          case "file:updated":
            return prev.map(f =>
              f.id === event.fileId ? { ...f, content: event.content } : f
            )
          case "file:created":
            if (prev.some(f => f.id === event.fileId)) return prev
            return [...prev, { id: event.fileId, path: event.path, content: event.content, comments: [] }]
          case "file:deleted":
            return prev.filter(f => f.id !== event.fileId)
          default:
            return prev
        }
      })
    }
    return onExternalEvent(handler)
  }, [onExternalEvent])

  // ─── File helpers ──────────────────────────────────────

  const file = internalFiles.find(f => f.path === activePath)
  const treeFiles: TreeFile[] = internalFiles.map(f => ({ id: f.id, path: f.path }))

  const handleFileSelect = useCallback((tf: TreeFile) => {
    onNavigate?.(tf.path)
    if (typeof window !== "undefined" && window.innerWidth <= 640) setSidebarOpen(false)
  }, [onNavigate])

  const updateFileComments = (fileId: string, updater: (comments: Comment[]) => Comment[]) => {
    setInternalFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, comments: updater(f.comments) } : f)
    )
  }

  // ─── Comment handlers (optimistic) ────────────────────

  const handleCreateComment = useCallback(async (anchor: Anchor, body?: string) => {
    if (!file) return
    const tempId = `temp-${Date.now()}`
    updateFileComments(file.id, comments => [
      ...comments,
      { id: tempId, anchor, body: body || "", author: "You", createdAt: new Date().toISOString(), replies: [] },
    ])
    if (body) {
      try {
        const result = await data.createComment(file.id, anchor, body)
        updateFileComments(file.id, comments =>
          comments.map(c => c.id === tempId ? { ...c, id: result.id } : c)
        )
      } catch {
        updateFileComments(file.id, comments => comments.filter(c => c.id !== tempId))
      }
    }
  }, [file, data])

  const handleUpdateComment = useCallback(async (commentId: string, body: string) => {
    if (!file) return
    const comment = file.comments.find(c => c.id === commentId)
    if (!comment) return
    updateFileComments(file.id, comments =>
      comments.map(c => c.id === commentId ? { ...c, body } : c)
    )
    try {
      const result = await data.createComment(file.id, comment.anchor, body)
      updateFileComments(file.id, comments =>
        comments.map(c => c.id === commentId ? { ...c, id: result.id } : c)
      )
    } catch {
      updateFileComments(file.id, comments => comments.filter(c => c.id !== commentId))
    }
  }, [file, data])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!file) return
    updateFileComments(file.id, comments => comments.filter(c => c.id !== commentId))
    try {
      await data.deleteComment(file.id, commentId)
    } catch {
      // Already removed optimistically — if delete fails, it's gone locally
    }
  }, [file, data])

  const handleAddReply = useCallback(async (commentId: string, body: string) => {
    if (!file) return
    const tempId = `temp-${Date.now()}`
    updateFileComments(file.id, comments =>
      comments.map(c =>
        c.id === commentId
          ? { ...c, replies: [...c.replies, { id: tempId, body, author: "You", createdAt: new Date().toISOString() }] }
          : c
      )
    )
    try {
      const result = await data.addReply(file.id, commentId, body)
      updateFileComments(file.id, comments =>
        comments.map(c =>
          c.id === commentId
            ? { ...c, replies: c.replies.map(r => r.id === tempId ? { ...r, id: result.id } : r) }
            : c
        )
      )
    } catch {
      updateFileComments(file.id, comments =>
        comments.map(c =>
          c.id === commentId
            ? { ...c, replies: c.replies.filter(r => r.id !== tempId) }
            : c
        )
      )
    }
  }, [file, data])

  const handleContentChange = useCallback(async (content: string) => {
    if (!file) return
    // Always update client state
    setInternalFiles(prev =>
      prev.map(f => f.id === file.id ? { ...f, content } : f)
    )
    // Only persist on keystroke in auto mode
    if (saveMode === "auto" && data.updateFile) {
      await data.updateFile(file.id, content)
    }
  }, [file, data, saveMode])

  // Cmd/Ctrl+S saves in manual mode
  useEffect(() => {
    if (saveMode !== "manual") return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        const current = internalFiles.find(f => f.path === activePath)
        if (current && data.updateFile) {
          data.updateFile(current.id, current.content)
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [saveMode, activePath, internalFiles, data])

  const handleLinkClick = useCallback((href: string) => {
    const dir = activePath?.includes("/") ? activePath.replace(/\/[^/]+$/, "/") : ""
    const resolved = dir + href
    const match = internalFiles.find(f => f.path === resolved || f.path === href)
    if (match) onNavigate?.(match.path)
  }, [activePath, internalFiles, onNavigate])

  // ─── Breadcrumb ────────────────────────────────────────

  const breadcrumb = (() => {
    const all: { label: string; nav?: string }[] = [
      { label: "~" },
      { label: rootName, nav: "" },
    ]
    if (activePath) {
      const parts = activePath.split("/")
      for (let i = 0; i < parts.length - 1; i++) {
        const prefix = parts.slice(0, i + 1).join("/") + "/"
        const first = internalFiles.find(f => f.path.startsWith(prefix))
        all.push({ label: parts[i], nav: first?.path })
      }
      all.push({ label: parts[parts.length - 1] })
    }
    if (all.length <= 4) return all
    return [all[0], { label: "…" }, all[all.length - 2], all[all.length - 1]]
  })()

  // ─── Render ────────────────────────────────────────────

  return (
    <div className={`engei-workspace${!sidebarOpen ? " sidebar-collapsed" : ""}`}>
      <div className={`workspace-backdrop ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`workspace-sidebar ${sidebarOpen ? "open" : ""}`}>
        {sidebarExtra}
        <div className="sidebar-header">
          <div className="header-spacer" />
          {onCreateFile && (
            <button className="sidebar-action" onClick={() => onCreateFile()} title="New file">
              <PlusIcon />
            </button>
          )}
          {onCreateFolder && (
            <button className="sidebar-action" onClick={() => onCreateFolder()} title="New folder">
              <FolderPlusIcon />
            </button>
          )}
          <button className="sidebar-action" onClick={() => useFileTreeStore.getState().collapseAll()} title="Collapse all folders">
            <CollapseIcon />
          </button>
          <button className="sidebar-action" onClick={() => setSidebarOpen(false)} title="Collapse sidebar">
            <SidebarCloseIcon />
          </button>
        </div>
        {workspaces && <WorkspaceSwitcher {...workspaces} onRequestCreate={() => setShowCreateWs(true)} />}
        <FileTree
          files={treeFiles}
          folders={folders}
          activePath={activePath}
          theme={theme}
          indent={workspaces ? 1 : 0}
          onFileSelect={handleFileSelect}
          onRenameFile={onRenameFile}
          onDeleteFile={onDeleteFile}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
        />
      </div>
      <div className="workspace-main" style={{ position: "relative" }}>
        {showCreateWs && workspaces?.onCreate && (
          <Dialog title="New workspace" onClose={() => { setShowCreateWs(false); setNewWsName("") }}>
            <div className="engei-dialog-description">Create a workspace to organize your files separately.</div>
            <label className="engei-dialog-label">Name</label>
            <input
              autoFocus
              className="engei-dialog-input"
              placeholder="e.g. Work, Personal, Research"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && newWsName.trim()) {
                  workspaces.onCreate!(newWsName.trim())
                  setNewWsName("")
                  setShowCreateWs(false)
                }
              }}
            />
            <div className="engei-dialog-actions">
              <button className="engei-dialog-btn" onClick={() => { setShowCreateWs(false); setNewWsName("") }}>Cancel</button>
              <button
                className="engei-dialog-btn primary"
                disabled={!newWsName.trim()}
                onClick={() => {
                  workspaces.onCreate!(newWsName.trim())
                  setNewWsName("")
                  setShowCreateWs(false)
                }}
              >Create</button>
            </div>
          </Dialog>
        )}
        <header className="workspace-header">
          <button className={`sidebar-toggle ${sidebarOpen ? "hidden" : ""}`} onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <nav className="breadcrumb">
            {breadcrumb.map((seg, i) => (
              <span key={i}>
                {i > 0 && <span className="breadcrumb-sep">/</span>}
                {seg.nav != null ? (
                  <a className="breadcrumb-link" onClick={() => onNavigate?.(seg.nav || null)}>{seg.label}</a>
                ) : (
                  <span>{seg.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="header-spacer" />
          {file && (
            <button
              className="workspace-action"
              onClick={() => {
                navigator.clipboard.writeText(file.content)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
          {headerExtra}
          <button className="workspace-action" onClick={toggleTheme}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
        <div className="workspace-editor">
          {file ? (
            <Editor
              content={file.content}
              filename={file.path}
              comments={file.comments}
              commentsLocked={commentsLocked}
              readOnly={readOnly}
              mode={/\.(md|mdx)$/i.test(file.path) ? markdownMode : "source"}
              theme={theme}
              widgets={widgets}
              onChange={!readOnly ? handleContentChange : undefined}
              onCreateComment={handleCreateComment}
              onUpdateComment={handleUpdateComment}
              onDeleteComment={handleDeleteComment}
              onAddReply={handleAddReply}
              onLinkClick={handleLinkClick}
            />
          ) : (
            emptyState || <div className="workspace-empty">Select a file to view</div>
          )}
        </div>
      </div>
    </div>
  )
}
