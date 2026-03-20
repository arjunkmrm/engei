/**
 * Hook to track text selection and show the comment pill.
 *
 * Key design (from ProseMirror/Floating UI research):
 * - Snapshot rects SYNCHRONOUSLY in mouseup (survives DOM mutations)
 * - Do NOT call domRangeToSourceRange on mouseup (fragile, walks DOM)
 * - Store the selected text for fallback anchor creation
 * - Source offsets are resolved later when the user clicks the pill
 */

import { useEffect, useState, type RefObject } from "react"
import { domRangeToSourceRange } from "./markedPositions"
import { computePillPosition } from "../comments/pillPositioning"

export interface PillPosition {
  top: number
  left: number
  /** Source offset — resolved eagerly if possible, -1 if deferred */
  from: number
  /** Source offset — resolved eagerly if possible, -1 if deferred */
  to: number
  direction: "above" | "below"
  /** Selected text — used as fallback to find anchor if source offsets are -1 */
  selectedText?: string
}

export function useTextSelection(
  containerRef: RefObject<HTMLElement | null>,
  dep: string,
): [PillPosition | null, (pos: PillPosition | null) => void] {
  const [pillPos, setPillPos] = useState<PillPosition | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleMouseDown = () => setPillPos(null)

    const handleMouseUp = () => {
      // ── Snapshot everything SYNCHRONOUSLY ────────────────────
      // Before React's useLayoutEffect can clearHighlights/normalize
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) return

      const range = sel.getRangeAt(0)

      // Relaxed containment: check against preview-inner, not just content div
      const inner = (el.closest(".md-preview-inner") as HTMLElement) || el
      if (!inner.contains(range.startContainer) || !inner.contains(range.endContainer)) return

      // Snapshot rects (survives DOM mutations)
      const rects = Array.from(range.getClientRects())
      if (rects.length === 0) return

      // Try source mapping eagerly — but don't block the pill if it fails
      let from = -1, to = -1
      const srcRange = domRangeToSourceRange(range)
      if (srcRange) {
        from = srcRange.start
        to = srcRange.end
      }

      // Snapshot selected text as fallback
      const selectedText = sel.toString()

      // ── Defer positioning to next frame ──────────────────────
      requestAnimationFrame(() => {
        const container = (el.closest(".md-preview-inner") as HTMLElement) || el
        const containerRect = container.getBoundingClientRect()

        // Vertical bounds: full selection (all rects)
        let selTop = Infinity, selBottom = -Infinity
        for (const r of rects) {
          selTop = Math.min(selTop, r.top)
          selBottom = Math.max(selBottom, r.bottom)
        }

        const relTop = selTop - containerRect.top
        const relBottom = selBottom - containerRect.top

        // Visibility guard: skip if selection is entirely off-screen
        if (relBottom < 0 || relTop > containerRect.height) return

        // Horizontal center: merge all rects on the first line
        // (inline elements like <strong> split a single line into many rects)
        const firstLineTop = rects[0].top
        let firstLineLeft = Infinity, firstLineRight = -Infinity
        for (const r of rects) {
          if (Math.abs(r.top - firstLineTop) > 2) break // different line
          firstLineLeft = Math.min(firstLineLeft, r.left)
          firstLineRight = Math.max(firstLineRight, r.right)
        }
        const relCenterX = ((firstLineLeft + firstLineRight) / 2) - containerRect.left

        // selTop (viewport-relative) tells us how much room there is above in the visible screen
        const viewportRoomAbove = selTop
        const placement = computePillPosition(relTop, relBottom, relCenterX, containerRect.width, viewportRoomAbove)

        setPillPos({
          top: placement.top,
          left: placement.left,
          from,
          to,
          direction: placement.direction,
          selectedText,
        })
      })
    }

    el.addEventListener("mousedown", handleMouseDown)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      el.removeEventListener("mousedown", handleMouseDown)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dep, containerRef])

  return [pillPos, setPillPos]
}
