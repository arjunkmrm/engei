/**
 * CM6 WidgetType wrapper for loading-games package.
 * The games themselves are framework-agnostic; this bridges to CM6.
 */

import { WidgetType } from "@codemirror/view"
import { randomGame, createGameCanvas } from "loading-games"

class GameWidget extends WidgetType {
  private game = randomGame()

  toDOM() {
    const gc = createGameCanvas(this.game)
    gc.canvas.className = "cm-slash-game"
    gc.start()
    ;(gc.canvas as any)._stop = gc.stop
    return gc.canvas
  }

  destroy(dom: HTMLElement) {
    ;(dom as any)._stop?.()
  }

  ignoreEvent() { return true }
}

export function randomGameWidget(): WidgetType {
  return new GameWidget()
}
