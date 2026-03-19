/**
 * Editor — standalone code editor with inline comments.
 * Pure UI component: props in, callbacks out.
 */

import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from "react"
import type { EditorView } from "@codemirror/view"
import CodeMirrorEditor from "./editor/CodeMirrorEditor"
import CommentPill from "./comments/CommentPill"
import CommentMargin from "./comments/CommentMargin"
import MarkdownPreview from "./preview/MarkdownPreview"
import { createAnchor } from "./comments/anchoring"
import type { EditorProps } from "./types"

export interface EditorHandle {
  /** Get the current document content */
  getContent: () => string
  /** Focus the editor */
  focus: () => void
  /** Get the underlying CodeMirror EditorView (source mode only) */
  getView: () => EditorView | null
}

export default forwardRef<EditorHandle, EditorProps>(function Editor({
  content,
  filename = "",
  readOnly = false,
  mode = "source",
  comments = [],
  activeCommentId = null,
  commentsVisible = true,
  theme = "dark",
  className = "",
  onChange,
  onCreateComment,
  onUpdateComment,
  onAddComment, // deprecated compat
  onDeleteComment,
  onAddReply,
  onActiveCommentChange,
  onLinkClick,
  widgets,
}, ref) {
  const [view, setView] = useState<EditorView | null>(null)
  const isDark = theme === "dark"
  const contentRef = useRef(content)
  contentRef.current = content

  // Imperative handle
  useImperativeHandle(ref, () => ({
    getContent: () => contentRef.current,
    focus: () => view?.focus(),
    getView: () => view,
  }), [view])

  // When user clicks the comment pill in source mode
  const handleSourceComment = useCallback((from: number, to: number) => {
    const doc = view?.state.doc.toString() || content
    const anchor = createAnchor(doc, from, to)
    if (onCreateComment) {
      onCreateComment(anchor)
    } else if (onAddComment) {
      onAddComment(anchor, "")
    }
  }, [view, content, onCreateComment, onAddComment])

  // When CommentCard submits a body for a draft comment
  const handleSubmitBody = useCallback((commentId: string, body: string) => {
    if (onUpdateComment) {
      onUpdateComment(commentId, body)
    } else if (onAddComment) {
      const comment = comments.find(c => c.id === commentId)
      if (comment) onAddComment(comment.anchor, body)
    }
  }, [comments, onUpdateComment, onAddComment])

  // Compat wrapper: MarkdownPreview still uses onAddComment internally
  const handlePreviewAddComment = useCallback((anchor: any, body: string) => {
    if (body === "" && onCreateComment) {
      onCreateComment(anchor)
    } else if (onAddComment) {
      onAddComment(anchor, body)
    }
  }, [onCreateComment, onAddComment])

  const handleActiveChange = useCallback((id: string | null) => {
    onActiveCommentChange?.(id)
  }, [onActiveCommentChange])

  if (mode === "preview") {
    return (
      <div className={`koen-editor ${className}`.trim()} data-theme={theme}>
        <div className="editor-container preview-scroll">
          <MarkdownPreview
            content={content}
            comments={comments}
            commentsVisible={commentsVisible}
            theme={theme}
            widgets={widgets}
            onAddComment={handlePreviewAddComment}
            onDeleteComment={(id) => onDeleteComment?.(id)}
            onAddReply={(commentId, body) => onAddReply?.(commentId, body)}
            onLinkClick={onLinkClick}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`koen-editor ${className}`.trim()} data-theme={theme}>
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
})
