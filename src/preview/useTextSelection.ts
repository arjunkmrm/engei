/**
 * Hook to track text selection within a container and compute pill position.
 * Returns the current pill position (or null) and a setter to clear it.
 */

import { useEffect, useState, type RefObject } from "react"
import { domRangeToSourceRange } from "./markedPositions"

export interface PillPosition {
  top: number
  left: number
  from: number
  to: number
}

export function useTextSelection(
  containerRef: RefObject<HTMLElement | null>,
  /** Re-attach listeners when this value changes (typically the parsed html) */
  dep: string,
): [PillPosition | null, (pos: PillPosition | null) => void] {
  const [pillPos, setPillPos] = useState<PillPosition | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleSelection = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setPillPos(null); return }

      const range = sel.getRangeAt(0)
      if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) { setPillPos(null); return }

      const srcRange = domRangeToSourceRange(range)
      if (!srcRange) { setPillPos(null); return }

      const rects = range.getClientRects()
      if (rects.length === 0) { setPillPos(null); return }

      const firstRect = rects[0]
      const containerRect = (el.closest(".md-preview-inner") as HTMLElement)?.getBoundingClientRect() || el.getBoundingClientRect()

      const centerX = (firstRect.left + firstRect.right) / 2
      const left = Math.max(40, Math.min(centerX - containerRect.left, containerRect.width - 40))
      setPillPos({
        top: firstRect.top - containerRect.top - 36,
        left,
        from: srcRange.start,
        to: srcRange.end,
      })
    }

    const handleMouseDown = () => setPillPos(null)
    const handleMouseUp = () => requestAnimationFrame(handleSelection)

    let selectionTimer: ReturnType<typeof setTimeout> | null = null
    const handleSelectionChange = () => {
      if (selectionTimer) clearTimeout(selectionTimer)
      selectionTimer = setTimeout(handleSelection, 200)
    }

    el.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mouseup", handleMouseUp)
    document.addEventListener("selectionchange", handleSelectionChange)
    return () => {
      el.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("selectionchange", handleSelectionChange)
      if (selectionTimer) clearTimeout(selectionTimer)
    }
  }, [dep, containerRef])

  return [pillPos, setPillPos]
}
