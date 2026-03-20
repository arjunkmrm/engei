/**
 * Right-side margin showing comment cards aligned with their highlighted text.
 * Pure UI — receives all data and callbacks as props.
 */

import type { EditorView } from "@codemirror/view"
import { resolveAnchor } from "./anchoring"
import CommentCard from "./CommentCard"
import type { Comment } from "../types"

interface Props {
  view: EditorView | null
  comments: Comment[]
  content: string
  activeCommentId: string | null
  onActiveCommentChange: (id: string | null) => void
  onDeleteComment?: (id: string) => void
  onSubmitBody: (id: string, body: string) => void
  onAddReply: (commentId: string, body: string) => void
}

export default function CommentMargin({
  view,
  comments,
  content,
  activeCommentId,
  onActiveCommentChange,
  onDeleteComment,
  onSubmitBody,
  onAddReply,
}: Props) {
  if (comments.length === 0 || !view) return null

  const positioned = comments.map(comment => {
    let top = 0
    const range = resolveAnchor(content, comment.anchor)

    if (range && view) {
      try {
        const coords = view.coordsAtPos(range.from)
        if (coords) {
          const editorRect = view.dom.parentElement!.getBoundingClientRect()
          top = coords.top - editorRect.top
        }
      } catch {}
    }

    return { comment, top }
  })

  // Sort by vertical position
  positioned.sort((a, b) => a.top - b.top)

  // Prevent overlap: ensure at least 8px gap between cards
  const MIN_GAP = 8
  const cardHeights = positioned.map(() => 120) // approximate
  for (let i = 1; i < positioned.length; i++) {
    const prevBottom = positioned[i - 1].top + cardHeights[i - 1] + MIN_GAP
    if (positioned[i].top < prevBottom) {
      positioned[i].top = prevBottom
    }
  }

  return (
    <div className="comment-margin">
      {positioned.map(({ comment, top }) => (
        <div
          key={comment.id}
          className="comment-card-wrapper"
          style={{ top }}
        >
          <CommentCard
            comment={comment}
            isActive={comment.id === activeCommentId}
            onActivate={(id) => onActiveCommentChange(id)}
            onDeactivate={() => onActiveCommentChange(null)}
            onDelete={onDeleteComment}
            onSubmitBody={onSubmitBody}
            onAddReply={onAddReply}
          />
        </div>
      ))}
    </div>
  )
}
