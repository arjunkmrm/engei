/**
 * CM6 WidgetType for rendering inline images in live editing mode.
 * Replaces ![alt](url) with an actual <img> element.
 * When cursor is on the same line, reveals raw markdown for editing.
 */

import { WidgetType, EditorView } from "@codemirror/view"

export class LiveImageType extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly theme: "dark" | "light",
  ) {
    super()
  }

  eq(other: LiveImageType): boolean {
    return this.src === other.src && this.alt === other.alt && this.theme === other.theme
  }

  toDOM(view: EditorView): HTMLElement {
    const wrapper = document.createElement("div")
    wrapper.className = "cm-live-image"

    const img = document.createElement("img")
    img.src = this.src
    img.alt = this.alt
    img.style.maxWidth = "50%"
    img.style.maxHeight = "300px"
    img.style.borderRadius = "6px"
    img.style.display = "block"
    img.style.margin = "4px 0"
    img.style.objectFit = "cover"

    img.addEventListener("load", () => {
      requestAnimationFrame(() => view.requestMeasure())
    })

    img.addEventListener("error", () => {
      wrapper.textContent = `⚠ Image not found: ${this.alt || this.src}`
      wrapper.style.opacity = "0.5"
      wrapper.style.fontSize = "0.85em"
      wrapper.style.padding = "8px 0"
    })

    wrapper.appendChild(img)
    return wrapper
  }

  get estimatedHeight(): number {
    return 200
  }

  ignoreEvent(): boolean {
    return true
  }
}
