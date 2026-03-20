/**
 * Floating "Comment" pill that appears when text is selected in the source editor.
 * Centered above the selection. No mouse coordinate tracking.
 */

import { useEffect, useState, useCallback } from "react"
import type { EditorView } from "@codemirror/view"
import { computePillPosition } from "./pillPositioning"

interface Props {
  view: EditorView | null
  onComment: (from: number, to: number) => void
}

export default function CommentPill({ view, onComment }: Props) {
  const [pos, setPos] = useState<{
    top: number; left: number; from: number; to: number; direction: "above" | "below"
  } | null>(null)

  const updatePosition = useCallback(() => {
    if (!view) { setPos(null); return }

    const sel = view.state.selection.main
    if (sel.empty) { setPos(null); return }

    const startCoords = view.coordsAtPos(sel.from)
    const endCoords = view.coordsAtPos(sel.to)
    if (!startCoords || !endCoords) { setPos(null); return }

    const parent = view.dom.parentElement!
    const editorRect = parent.getBoundingClientRect()

    const selTop = Math.min(startCoords.top, endCoords.top) - editorRect.top
    const selBottom = Math.max(startCoords.bottom, endCoords.bottom) - editorRect.top
    const selCenterX = ((startCoords.left + endCoords.right) / 2) - editorRect.left

    const viewportRoomAbove = Math.min(startCoords.top, endCoords.top)
    const placement = computePillPosition(selTop, selBottom, selCenterX, editorRect.width, viewportRoomAbove)

    setPos({
      top: placement.top,
      left: placement.left,
      from: sel.from,
      to: sel.to,
      direction: placement.direction,
    })
  }, [view])

  useEffect(() => {
    if (!view) return

    const handleMouseDown = () => setPos(null)
    const handleMouseUp = () => updatePosition()
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
      className={`comment-pill ${pos.direction === "below" ? "comment-pill-below" : ""}`}
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
