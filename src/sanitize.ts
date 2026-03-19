/**
 * Sanitized markdown rendering.
 * Wraps marked.parse with DOMPurify to prevent XSS from user content.
 */

import { marked } from "marked"
import DOMPurify from "dompurify"

/** Parse markdown and sanitize the resulting HTML. */
export function renderMarkdown(src: string): string {
  return DOMPurify.sanitize(marked.parse(src) as string)
}
