/**
 * Controlled CodeMirror 6 editor component.
 * Accepts content as a prop, emits onChange.
 */

import { useEffect, useRef, useCallback } from "react"
import { EditorView, basicSetup } from "codemirror"
import { EditorState } from "@codemirror/state"
import { buildSonoTheme, getSyntaxHighlighting } from "./theme"
import { getLanguage } from "./languages"
import { commentField, setComments } from "../comments/CommentDecoration"
import { resolveAnchor } from "../comments/anchoring"
import type { Comment } from "../types"

interface Props {
  content: string
  filename?: string
  readOnly?: boolean
  isDark: boolean
  comments: Comment[]
  onChange?: (content: string) => void
  onViewReady?: (view: EditorView) => void
  onViewDestroy?: () => void
}

export default function CodeMirrorEditor({
  content,
  filename,
  readOnly = false,
  isDark,
  comments,
  onChange,
  onViewReady,
  onViewDestroy,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const suppressChangeRef = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Create/destroy editor when filename or theme changes
  useEffect(() => {
    if (!containerRef.current) return

    viewRef.current?.destroy()

    const extensions = [
      basicSetup,
      buildSonoTheme(isDark),
      getSyntaxHighlighting(isDark),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({ spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
      ...getLanguage(filename),
      commentField,
      EditorView.updateListener.of(update => {
        if (update.docChanged && !suppressChangeRef.current) {
          onChangeRef.current?.(update.state.doc.toString())
        }
      }),
    ]

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true))
    }

    const state = EditorState.create({ doc: content, extensions })
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    onViewReady?.(view)

    return () => {
      view.destroy()
      viewRef.current = null
      onViewDestroy?.()
    }
    // Intentionally only rebuild on filename/theme/readOnly change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, isDark, readOnly])

  // Sync controlled content prop -> CM6 doc
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (content === currentDoc) return

    suppressChangeRef.current = true
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: content },
    })
    suppressChangeRef.current = false
  }, [content])

  // Sync comments -> CM6 decorations
  const syncComments = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const doc = view.state.doc.toString()
    const resolved = comments
      .map(c => {
        const range = resolveAnchor(doc, c.anchor)
        return range ? { id: c.id, from: range.from, to: range.to } : null
      })
      .filter((r): r is { id: string; from: number; to: number } => r !== null)

    view.dispatch({ effects: setComments.of(resolved) })
  }, [comments])

  useEffect(() => {
    syncComments()
  }, [syncComments])

  return <div ref={containerRef} className="sono-editor-cm" />
}
