/**
 * Imperative highlight application for the markdown preview.
 * Takes computed ranges and applies/clears DOM highlight spans.
 */

import { wrapSourceRange, clearHighlights } from "./markedPositions"

interface HighlightRange {
  id: string
  from: number
  to: number
}

/**
 * Apply highlight spans to a container element.
 * Called imperatively from useLayoutEffect — not tied to React's render cycle.
 */
export function applyHighlights(
  el: HTMLElement,
  ranges: HighlightRange[],
  draftRange: { from: number; to: number } | null,
) {
  clearHighlights(el)
  for (const range of ranges) {
    wrapSourceRange(el, range.from, range.to, range.id)
  }
  if (draftRange) {
    wrapSourceRange(el, draftRange.from, draftRange.to, "draft")
  }
}
