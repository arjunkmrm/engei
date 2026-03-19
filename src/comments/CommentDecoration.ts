/**
 * CM6 StateField for comment annotations.
 * Tracks highlighted ranges through edits, provides decorations.
 */

import { StateEffect, StateField } from "@codemirror/state"
import { EditorView, Decoration } from "@codemirror/view"

// ─── Effects ─────────────────────────────────────────────

/** Bulk-set annotations on file open */
export const setComments = StateEffect.define<{ id: string; from: number; to: number }[]>()

/** Add a single comment */
export const addComment = StateEffect.define<{ id: string; from: number; to: number }>()

/** Remove a comment by id */
export const removeComment = StateEffect.define<string>()

// ─── Decoration factory ──────────────────────────────────

function commentMark(id: string) {
  return Decoration.mark({
    class: "cm-comment-highlight",
    inclusiveStart: false,
    inclusiveEnd: false,
    attributes: { "data-comment-id": id },
  })
}

// ─── State field ─────────────────────────────────────────

export const commentField = StateField.define({
  create() {
    return Decoration.none
  },
  update(decos, tr) {
    decos = decos.map(tr.changes)

    for (const e of tr.effects) {
      if (e.is(setComments)) {
        const marks = e.value
          .filter(c => c.from < c.to)
          .map(c => commentMark(c.id).range(c.from, c.to))
        decos = Decoration.none.update({ add: marks, sort: true })
      } else if (e.is(addComment)) {
        const { id, from, to } = e.value
        if (from < to) {
          decos = decos.update({
            add: [commentMark(id).range(from, to)],
          })
        }
      } else if (e.is(removeComment)) {
        decos = decos.update({
          filter: (_from, _to, val) => val.spec.attributes?.["data-comment-id"] !== e.value,
        })
      }
    }
    return decos
  },
  provide: f => EditorView.decorations.from(f),
})

// ─── Helpers ─────────────────────────────────────────────

/** Iterate all comment decorations, return [{ id, from, to }] */
export function getCommentRanges(state: import("@codemirror/state").EditorState): { id: string; from: number; to: number }[] {
  const decos = state.field(commentField, false)
  if (!decos) return []

  const ranges: { id: string; from: number; to: number }[] = []
  const iter = decos.iter()
  while (iter.value) {
    if (iter.from < iter.to) {
      const id = iter.value.spec.attributes?.["data-comment-id"]
      if (id) ranges.push({ id, from: iter.from, to: iter.to })
    }
    iter.next()
  }
  return ranges
}
