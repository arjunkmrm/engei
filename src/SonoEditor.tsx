/**
 * SonoEditor — standalone code editor with inline comments.
 * Pure UI component: props in, callbacks out.
 */

import { useState, useCallback } from "react"
import type { EditorView } from "@codemirror/view"
import CodeMirrorEditor from "./editor/CodeMirrorEditor"
import CommentPill from "./comments/CommentPill"
import CommentMargin from "./comments/CommentMargin"
import MarkdownPreview from "./preview/MarkdownPreview"
import { createAnchor } from "./comments/anchoring"
import type { SonoEditorProps } from "./types"

export default function SonoEditor({
  content,
  filename = "",
  readOnly = false,
  mode = "source",
  comments = [],
  activeCommentId = null,
  commentsVisible = true,
  theme = "dark",
  author = "You",
  className = "",
  onChange,
  onAddComment,
  onDeleteComment,
  onAddReply,
  onActiveCommentChange,
  onLinkClick,
}: SonoEditorProps) {
  const [view, setView] = useState<EditorView | null>(null)
  const isDark = theme === "dark"

  // When user clicks the comment pill in source mode
  const handleSourceComment = useCallback((from: number, to: number) => {
    if (!onAddComment) return
    const doc = view?.state.doc.toString() || content
    const anchor = createAnchor(doc, from, to)
    // Create a draft comment (empty body) — the CommentCard will show the input
    onAddComment(anchor, "")
  }, [view, content, onAddComment])

  // When CommentCard submits a body for a draft comment
  const handleSubmitBody = useCallback((commentId: string, body: string) => {
    // The consumer should update the comment's body in their state
    // We expose this as onAddComment with the existing anchor
    const comment = comments.find(c => c.id === commentId)
    if (comment && onAddComment) {
      // Re-emit with body filled in — consumer can update their state
      onAddComment(comment.anchor, body)
    }
  }, [comments, onAddComment])

  const handleActiveChange = useCallback((id: string | null) => {
    onActiveCommentChange?.(id)
  }, [onActiveCommentChange])

  if (mode === "preview") {
    return (
      <div className={`sono-editor ${className}`.trim()} data-theme={theme}>
        <div className="editor-container preview-scroll">
          <MarkdownPreview
            content={content}
            comments={comments}
            commentsVisible={commentsVisible}
            theme={theme}
            onAddComment={(anchor, body) => onAddComment?.(anchor, body)}
            onDeleteComment={(id) => onDeleteComment?.(id)}
            onAddReply={(commentId, body) => onAddReply?.(commentId, body)}
            onLinkClick={onLinkClick}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`sono-editor ${className}`.trim()} data-theme={theme}>
      <div className="editor-main">
        <div className="editor-container" style={{ position: "relative" }}>
          <CodeMirrorEditor
            content={content}
            filename={filename}
            readOnly={readOnly}
            isDark={isDark}
            comments={comments}
            onChange={onChange}
            onViewReady={setView}
            onViewDestroy={() => setView(null)}
          />
          {commentsVisible && view && (
            <CommentPill view={view} onComment={handleSourceComment} />
          )}
        </div>
        {commentsVisible && comments.length > 0 && (
          <CommentMargin
            view={view}
            comments={comments}
            content={content}
            activeCommentId={activeCommentId}
            onActiveCommentChange={handleActiveChange}
            onDeleteComment={(id) => onDeleteComment?.(id)}
            onSubmitBody={handleSubmitBody}
            onAddReply={(commentId, body) => onAddReply?.(commentId, body)}
          />
        )}
      </div>
    </div>
  )
}
