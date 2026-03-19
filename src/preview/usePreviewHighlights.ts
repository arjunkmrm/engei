/**
 * Internal Zustand store for managing preview highlight state.
 * Not exported to consumers — this is an implementation detail.
 *
 * Manages: which ranges should be highlighted (comments + draft),
 * applies DOM mutations via subscription (outside React render cycle).
 */

import { create } from "zustand"
import { resolveAnchor } from "../comments/anchoring"
import { wrapSourceRange, clearHighlights } from "./markedPositions"
import type { Comment } from "../types"

interface HighlightRange {
  id: string
  from: number
  to: number
}

interface PreviewHighlightState {
  ranges: HighlightRange[]
  draftRange: { from: number; to: number } | null

  /** Recompute highlight ranges from comments + content */
  setFromComments: (comments: Comment[], content: string) => void

  /** Set a draft highlight range (before comment is submitted) */
  setDraft: (draft: { from: number; to: number } | null) => void
}

export function createPreviewHighlightStore() {
  return create<PreviewHighlightState>((set) => ({
    ranges: [],
    draftRange: null,

    setFromComments: (comments, content) => {
      const ranges: HighlightRange[] = []
      for (const comment of comments) {
        const resolved = resolveAnchor(content, comment.anchor)
        if (resolved) {
          ranges.push({ id: comment.id, from: resolved.from, to: resolved.to })
        }
      }
      set({ ranges })
    },

    setDraft: (draft) => set({ draftRange: draft }),
  }))
}

/**
 * Apply highlight spans to a container element based on store state.
 * Called imperatively — not tied to React's render cycle.
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
