import { useState, useRef, useEffect } from "react"
import { useFileTreeStore } from "./store"

export interface TreeFile {
  id: string
  path: string
  [key: string]: any
}

export interface FileTreeProps {
  files: TreeFile[]
  folders?: string[]
  activePath?: string | null
  title?: string
  rootName?: string
  theme?: "dark" | "light"
  indent?: number
  onFileSelect?: (file: TreeFile) => void
  onRenameFile?: (fileId: string, newPath: string) => void
  onDeleteFile?: (fileId: string) => void
  onCreateFile?: (folderPath: string) => void
  onCreateFolder?: (parentPath?: string) => void
  onRenameFolder?: (oldPath: string, newPath: string) => void
}

// ─── Tree building ──────────────────────────────────────────

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  file?: TreeFile
  children: TreeNode[]
}

function buildTree(files: TreeFile[], folders?: string[]): TreeNode[] {
  const root: TreeNode[] = []
  const dirMap = new Map<string, TreeNode>()

  function ensureDir(dirPath: string): TreeNode {
    if (dirMap.has(dirPath)) return dirMap.get(dirPath)!
    const parts = dirPath.split("/")
    const name = parts[parts.length - 1]
    const node: TreeNode = { name, path: dirPath, isDir: true, children: [] }
    dirMap.set(dirPath, node)

    if (parts.length === 1) {
      root.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join("/")
      const parent = ensureDir(parentPath)
      parent.children.push(node)
    }
    return node
  }

  for (const file of files) {
    const parts = file.path.split("/")
    const name = parts[parts.length - 1]
    const node: TreeNode = { name, path: file.path, isDir: false, file, children: [] }

    if (parts.length === 1) {
      root.push(node)
    } else {
      const dirPath = parts.slice(0, -1).join("/")
      const parent = ensureDir(dirPath)
      parent.children.push(node)
    }
  }

  // Include explicit empty folders
  if (folders) {
    for (const folderPath of folders) {
      ensureDir(folderPath)
    }
  }

  // Sort: folders first (alphabetically), then files (alphabetically)
  function sortChildren(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const n of nodes) {
      if (n.children.length) sortChildren(n.children)
    }
  }
  sortChildren(root)

  return root
}

// ─── Icons ──────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`koen-tree-chevron ${open ? "open" : ""}`}
      width="16" height="16" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

function FileIcon() {
  return (
    <span className="tree-file-badge">M</span>
  )
}

// ─── TreeNode component ─────────────────────────────────────

function TreeItem({
  node,
  depth,
  activePath,
  onFileSelect,
  onRenameFile,
  onDeleteFile,
  onCreateFile,
  onCreateFolder,
  onRenameFolder,
}: {
  node: TreeNode
  depth: number
  activePath?: string | null
  onFileSelect?: (file: TreeFile) => void
  onRenameFile?: (fileId: string, newPath: string) => void
  onDeleteFile?: (fileId: string) => void
  onCreateFile?: (folderPath: string) => void
  onCreateFolder?: (parentPath?: string) => void
  onRenameFolder?: (oldPath: string, newPath: string) => void
}) {
  const isOpen = useFileTreeStore((s) => s.expanded.has(node.path))
  const toggle = useFileTreeStore((s) => s.toggle)
  const isActive = !node.isDir && node.path === activePath
  const [renaming, setRenaming] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setContextMenu(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [contextMenu])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (node.isDir) {
      toggle(node.path)
    } else if (node.file && onFileSelect) {
      onFileSelect(node.file)
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    const hasFileActions = !node.isDir && (onRenameFile || onDeleteFile)
    const hasFolderActions = node.isDir && (onCreateFile || onCreateFolder || onRenameFolder)
    if (!hasFileActions && !hasFolderActions) return
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  function handleRenameSubmit(newName: string) {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === node.name) { setRenaming(false); return }

    if (node.isDir && onRenameFolder) {
      // Folder rename: compute new path
      const parentDir = node.path.includes("/") ? node.path.replace(/[^/]+$/, "") : ""
      onRenameFolder(node.path, parentDir + trimmed)
    } else if (node.file && onRenameFile) {
      // File rename: preserve directory prefix
      const dir = node.path.includes("/") ? node.path.replace(/[^/]+$/, "") : ""
      onRenameFile(node.file.id, dir + trimmed)
    }
    setRenaming(false)
  }

  return (
    <div className="koen-tree-node">
      <div
        className={`koen-tree-row ${node.isDir ? "dir" : "file"} ${isActive || contextMenu ? "active" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.isDir ? <ChevronIcon open={isOpen} /> : <FileIcon />}
        {renaming ? (
          <input
            autoFocus
            className="koen-tree-rename-input"
            defaultValue={node.name}
            onKeyDown={e => {
              if (e.key === "Enter") handleRenameSubmit((e.target as HTMLInputElement).value)
              else if (e.key === "Escape") setRenaming(false)
            }}
            onBlur={e => handleRenameSubmit(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="koen-tree-label">{node.name}</span>
        )}
      </div>
      {contextMenu && (
        <div ref={menuRef} className="koen-tree-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {node.isDir && onCreateFile && (
            <button onClick={() => { setContextMenu(null); onCreateFile(node.path) }}>New File</button>
          )}
          {node.isDir && onCreateFolder && (
            <button onClick={() => { setContextMenu(null); onCreateFolder(node.path) }}>New Folder</button>
          )}
          {node.isDir && onRenameFolder && (
            <button onClick={() => { setContextMenu(null); setRenaming(true) }}>Rename</button>
          )}
          {!node.isDir && onRenameFile && (
            <button onClick={() => { setContextMenu(null); setRenaming(true) }}>Rename</button>
          )}
          {!node.isDir && onDeleteFile && node.file && (
            <button onClick={() => { setContextMenu(null); onDeleteFile(node.file!.id) }}>Delete</button>
          )}
        </div>
      )}
      {node.isDir && isOpen && (
        <div className="koen-tree-children">
          {node.children.map(child => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              onFileSelect={onFileSelect}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FileTree component ─────────────────────────────────────

export default function FileTree({ files, folders, activePath, title, indent = 0, onFileSelect, onRenameFile, onDeleteFile, onCreateFile, onCreateFolder, onRenameFolder }: FileTreeProps) {
  const tree = buildTree(files, folders)

  const treeItems = tree.map(node => (
    <TreeItem
      key={node.path}
      node={node}
      depth={indent}
      activePath={activePath}
      onFileSelect={onFileSelect}
      onRenameFile={onRenameFile}
      onDeleteFile={onDeleteFile}
      onCreateFile={onCreateFile}
      onCreateFolder={onCreateFolder}
      onRenameFolder={onRenameFolder}
    />
  ))

  return (
    <div className="koen-file-tree">
      {title && <div className="koen-tree-title">{title}</div>}
      <div className="koen-tree-list">
        {treeItems}
      </div>
    </div>
  )
}
