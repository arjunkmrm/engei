/**
 * Floating "Comment" pill that appears when text is selected in the editor.
 * Positioned above the selection center.
 */

import { useEffect, useState, useCallback } from "react"
import type { EditorView } from "@codemirror/view"

interface Props {
  view: EditorView | null
  onComment: (from: number, to: number) => void
}

export default function CommentPill({ view, onComment }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number; from: number; to: number } | null>(null)

  const updatePosition = useCallback(() => {
    if (!view) { setPos(null); return }

    const sel = view.state.selection.main
    if (sel.empty) { setPos(null); return }

    const startCoords = view.coordsAtPos(sel.from)
    const endCoords = view.coordsAtPos(sel.to)
    if (!startCoords || !endCoords) { setPos(null); return }

    const editorRect = view.dom.parentElement!.getBoundingClientRect()
    const topY = Math.min(startCoords.top, endCoords.top)
    const centerX = (startCoords.left + endCoords.right) / 2
    setPos({
      top: topY - editorRect.top - 36,
      left: centerX - editorRect.left,
      from: sel.from,
      to: sel.to,
    })
  }, [view])

  useEffect(() => {
    if (!view) return

    const handleMouseDown = () => setPos(null)
    const handleMouseUp = () => requestAnimationFrame(updatePosition)
    const handleScroll = () => setPos(null)

    view.dom.addEventListener("mousedown", handleMouseDown)
    view.dom.ownerDocument.addEventListener("mouseup", handleMouseUp)
    view.scrollDOM.addEventListener("scroll", handleScroll)

    return () => {
      view.dom.removeEventListener("mousedown", handleMouseDown)
      view.dom.ownerDocument.removeEventListener("mouseup", handleMouseUp)
      view.scrollDOM.removeEventListener("scroll", handleScroll)
    }
  }, [view, updatePosition])

  if (!pos) return null

  return (
    <button
      className="comment-pill"
      aria-label="Add comment on selection"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onComment(pos.from, pos.to)
      }}
    >
      Comment
    </button>
  )
}
