/**
 * Pure positioning logic for the comment pill.
 *
 * Always above the selection, centered horizontally.
 * Flips below only if there's no room above in the visible viewport.
 * No mouse tracking. No direction detection. Pure geometry.
 */

const PILL_HEIGHT = 28
const GAP = 6
const MIN_MARGIN = 8

export interface PillPlacement {
  top: number
  left: number
  direction: "above" | "below"
}

/**
 * @param selTop     - selection top, relative to container (can be large if container scrolls with page)
 * @param selBottom  - selection bottom, relative to container
 * @param selCenterX - horizontal center of the first line, relative to container
 * @param containerWidth - container width for X clamping
 * @param viewportRoomAbove - pixels between viewport top and selection top (for flip logic)
 */
export function computePillPosition(
  selTop: number,
  selBottom: number,
  selCenterX: number,
  containerWidth: number,
  viewportRoomAbove = Infinity,
): PillPlacement {
  // Flip below if not enough room above in the visible viewport
  const hasRoomAbove = viewportRoomAbove >= PILL_HEIGHT + GAP

  const top = hasRoomAbove
    ? selTop - PILL_HEIGHT - GAP
    : selBottom + GAP

  const direction = hasRoomAbove ? "above" : "below"

  const left = Math.max(MIN_MARGIN, Math.min(selCenterX, containerWidth - MIN_MARGIN))

  return { top: Math.max(0, top), left, direction }
}
