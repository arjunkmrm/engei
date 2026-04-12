import { useEffect, useRef } from "react"
import type { EditorView } from "@codemirror/view"
import { useSearchStore } from "./store"

interface EditorHandle {
  getView: () => EditorView | null
}

interface SearchBarProps {
  editorRef: React.RefObject<EditorHandle | null>
}

export default function SearchBar({ editorRef }: SearchBarProps) {
  const { term, current, total, ops, setTerm, setOpen, setMatches } = useSearchStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function getView() {
    return editorRef.current?.getView() ?? null
  }

  function applySearch(newTerm: string) {
    setTerm(newTerm)
    const view = getView()
    if (!view || !ops) { setMatches(0, 0); return }
    ops.applyQuery(view, newTerm)
    const m = ops.countMatches(view, newTerm)
    setMatches(m.current, m.total)
  }

  function next() {
    const view = getView()
    if (!view || !term || !ops) return
    ops.findNext(view)
    const m = ops.countMatches(view, term)
    setMatches(m.current, m.total)
  }

  function prev() {
    const view = getView()
    if (!view || !term || !ops) return
    ops.findPrevious(view)
    const m = ops.countMatches(view, term)
    setMatches(m.current, m.total)
  }

  function close() {
    const view = getView()
    if (view && ops) {
      ops.clearQuery(view)
      view.focus()
    }
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); close() }
    else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); prev() }
    else if (e.key === "Enter") { e.preventDefault(); next() }
  }

  return (
    <div className="engei-search-bar">
      <input
        ref={inputRef}
        className="engei-search-input"
        placeholder="Find..."
        value={term}
        onChange={e => applySearch(e.target.value)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {term && (
        <span className="engei-search-count">
          {total > 0 ? `${current} of ${total}` : "No results"}
        </span>
      )}
      <button className="engei-search-btn" onClick={prev} title="Previous (Shift+Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <button className="engei-search-btn" onClick={next} title="Next (Enter)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <button className="engei-search-btn" onClick={close} title="Close (Escape)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
