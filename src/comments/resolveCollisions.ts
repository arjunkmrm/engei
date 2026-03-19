/**
 * Resolve vertical collisions between positioned items.
 * Items are sorted by `top` and pushed down when they'd overlap,
 * maintaining a minimum gap between consecutive items.
 */
export function resolveCollisions<T extends { top: number; height: number }>(
  items: T[],
  gap = 8,
): T[] {
  if (items.length === 0) return []

  const sorted = [...items].sort((a, b) => a.top - b.top)
  const resolved: T[] = []
  let bottomEdge = -Infinity

  for (const item of sorted) {
    const adjustedTop = Math.max(item.top, bottomEdge + gap)
    resolved.push({ ...item, top: adjustedTop })
    bottomEdge = adjustedTop + item.height
  }

  return resolved
}
