/**
 * Widget registry — maps widget types to hydration functions.
 * Consumers can register custom widget types.
 */

export type WidgetHydrator = (
  container: HTMLElement,
  spec: WidgetSpec,
  theme: "dark" | "light",
) => void | (() => void) // optional cleanup function

export interface WidgetSpec {
  widgetId: string
  type: string
  [key: string]: any
}

const registry = new Map<string, WidgetHydrator>()

export function registerWidget(type: string, hydrator: WidgetHydrator) {
  registry.set(type, hydrator)
}

export function getWidgetHydrator(type: string): WidgetHydrator | undefined {
  return registry.get(type)
}

export function hydrateWidgets(
  container: HTMLElement,
  theme: "dark" | "light",
): (() => void)[] {
  const cleanups: (() => void)[] = []
  const placeholders = container.querySelectorAll<HTMLElement>("[data-widget-spec]")

  for (const el of placeholders) {
    try {
      const spec: WidgetSpec = JSON.parse(el.getAttribute("data-widget-spec")!)
      const hydrator = registry.get(spec.type)
      if (hydrator) {
        const cleanup = hydrator(el, spec, theme)
        if (cleanup) cleanups.push(cleanup)
      } else {
        el.textContent = `Unknown widget type: ${spec.type}`
        el.style.color = "var(--color-text-secondary, #888)"
        el.style.fontStyle = "italic"
        el.style.padding = "1em"
      }
    } catch (err) {
      el.textContent = `Widget error: ${err}`
      el.style.color = "var(--color-text-danger, #e06c75)"
    }
  }

  return cleanups
}
