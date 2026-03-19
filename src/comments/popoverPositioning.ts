/**
 * Compute popover positions from highlight spans.
 * Uses getBoundingClientRect for accuracy — immune to intermediate
 * positioned elements (e.g. widget wrappers with position: relative).
 */
export function computePopoverPositions(container: HTMLElement, spans: HTMLElement[]): { id: string; top: number }[] {
  const containerRect = container.getBoundingClientRect()
  const containerScroll = container.scrollTop || 0
  return spans.map(span => ({
    id: span.getAttribute("data-comment-id") || "",
    top: span.getBoundingClientRect().top - containerRect.top + containerScroll,
  }))
}
