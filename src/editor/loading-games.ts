/**
 * Tiny loading games for the slash command spinner.
 * Each game is a CM6 WidgetType that renders on a small canvas.
 */

import { WidgetType } from "@codemirror/view"

// ─── Snake ─────────────────────────────────────────────────

export class SnakeGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const S = 6, P = 3, G = 1
    const size = S * (P + G) + G
    canvas.width = size
    canvas.height = size
    canvas.className = "cm-slash-game"
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext("2d")!
    const accent = "rgba(193, 95, 60, 0.9)"
    const foodColor = "rgba(193, 95, 60, 0.5)"
    const dotColor = "rgba(255, 255, 255, 0.06)"

    let snake = [{ x: 3, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 3 }]
    let food = { x: 5, y: 2 }
    let dir = { x: 1, y: 0 }

    function place(x: number, y: number) {
      return { px: G + x * (P + G), py: G + y * (P + G) }
    }

    function spawnFood() {
      const occupied = new Set(snake.map(s => `${s.x},${s.y}`))
      let attempts = 0
      do {
        food = { x: Math.floor(Math.random() * S), y: Math.floor(Math.random() * S) }
      } while (occupied.has(`${food.x},${food.y}`) && ++attempts < 50)
    }

    function step() {
      const head = snake[0]
      const dx = food.x - head.x, dy = food.y - head.y
      dir = Math.abs(dx) >= Math.abs(dy) ? { x: dx > 0 ? 1 : -1, y: 0 } : { x: 0, y: dy > 0 ? 1 : -1 }

      let nx = (head.x + dir.x + S) % S, ny = (head.y + dir.y + S) % S
      if (snake.some(s => s.x === nx && s.y === ny)) {
        for (const alt of [{ x: dir.y, y: dir.x }, { x: -dir.y, y: -dir.x }]) {
          nx = (head.x + alt.x + S) % S; ny = (head.y + alt.y + S) % S
          if (!snake.some(s => s.x === nx && s.y === ny)) { dir = alt; break }
        }
      }

      snake.unshift({ x: (head.x + dir.x + S) % S, y: (head.y + dir.y + S) % S })
      if (snake[0].x === food.x && snake[0].y === food.y) { snake.pop(); spawnFood() }
      else snake.pop()
    }

    function draw() {
      ctx.clearRect(0, 0, size, size)
      for (let x = 0; x < S; x++) for (let y = 0; y < S; y++) {
        const { px, py } = place(x, y); ctx.fillStyle = dotColor; ctx.fillRect(px, py, P, P)
      }
      const fp = place(food.x, food.y); ctx.fillStyle = foodColor; ctx.fillRect(fp.px, fp.py, P, P)
      for (const seg of snake) { const sp = place(seg.x, seg.y); ctx.fillStyle = accent; ctx.fillRect(sp.px, sp.py, P, P) }
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 120)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Maze ──────────────────────────────────────────────────

export class MazeGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const N = 7, C = 3
    const size = N * C
    canvas.width = size
    canvas.height = size
    canvas.className = "cm-slash-game"
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext("2d")!
    const wallColor = "rgba(255, 255, 255, 0.06)"
    const accent = "rgba(193, 95, 60, 0.9)"
    const trailColor = "rgba(193, 95, 60, 0.2)"
    const goalColor = "rgba(193, 95, 60, 0.5)"
    const goal = { x: N - 2, y: N - 2 }

    let grid: boolean[][] = []
    let solution: { x: number; y: number }[] = []
    let step = 0
    const trail = new Set<string>()

    function generate() {
      grid = Array.from({ length: N }, () => Array(N).fill(true))
      ;(function carve(cx: number, cy: number) {
        grid[cy][cx] = false
        for (const { dx, dy } of [{ dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }].sort(() => Math.random() - 0.5)) {
          const nx = cx + dx, ny = cy + dy
          if (nx >= 0 && nx < N && ny >= 0 && ny < N && grid[ny][nx]) {
            grid[cy + dy / 2][cx + dx / 2] = false
            carve(nx, ny)
          }
        }
      })(1, 1)
    }

    function solve() {
      const visited = new Set<string>(["1,1"])
      const queue = [{ x: 1, y: 1, path: [{ x: 1, y: 1 }] }]
      solution = []
      while (queue.length) {
        const curr = queue.shift()!
        if (curr.x === goal.x && curr.y === goal.y) { solution = curr.path; return }
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
          const nx = curr.x + dx, ny = curr.y + dy, key = `${nx},${ny}`
          if (nx >= 0 && nx < N && ny >= 0 && ny < N && !grid[ny][nx] && !visited.has(key)) {
            visited.add(key); queue.push({ x: nx, y: ny, path: [...curr.path, { x: nx, y: ny }] })
          }
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, size, size)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (grid[y][x]) { ctx.fillStyle = wallColor; ctx.fillRect(x * C, y * C, C, C) }
      }
      ctx.fillStyle = goalColor; ctx.fillRect(goal.x * C, goal.y * C, C, C)
      for (const key of trail) { const [tx, ty] = key.split(",").map(Number); ctx.fillStyle = trailColor; ctx.fillRect(tx * C, ty * C, C, C) }
      if (step < solution.length) {
        const pos = solution[step]
        trail.add(`${pos.x},${pos.y}`)
        ctx.fillStyle = accent; ctx.fillRect(pos.x * C, pos.y * C, C, C)
      }
    }

    generate(); solve(); draw()
    const interval = setInterval(() => {
      step++
      if (step >= solution.length) { step = 0; trail.clear(); generate(); solve() }
      draw()
    }, 100)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Game of Life ──────────────────────────────────────────

export class LifeGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const N = 12, C = 2
    const size = N * C
    canvas.width = size
    canvas.height = size
    canvas.className = "cm-slash-game"
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext("2d")!
    const alive = "rgba(193, 95, 60, 0.8)"
    const dead = "rgba(255, 255, 255, 0.04)"

    let grid = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => Math.random() < 0.35)
    )

    function neighbors(x: number, y: number): number {
      let count = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = (x + dx + N) % N, ny = (y + dy + N) % N
        if (grid[ny][nx]) count++
      }
      return count
    }

    function step() {
      const next = grid.map((row, y) =>
        row.map((cell, x) => {
          const n = neighbors(x, y)
          return cell ? n === 2 || n === 3 : n === 3
        })
      )
      // If stagnant (no change), reseed
      const same = grid.every((row, y) => row.every((c, x) => c === next[y][x]))
      if (same) {
        grid = Array.from({ length: N }, () =>
          Array.from({ length: N }, () => Math.random() < 0.35)
        )
      } else {
        grid = next
      }
    }

    function draw() {
      ctx.clearRect(0, 0, size, size)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        ctx.fillStyle = grid[y][x] ? alive : dead
        ctx.fillRect(x * C, y * C, C, C)
      }
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 150)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Breakout ──────────────────────────────────────────────

export class BreakoutGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const W = 24, H = 24
    canvas.width = W
    canvas.height = H
    canvas.className = "cm-slash-game"
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext("2d")!
    const accent = "rgba(193, 95, 60, 0.9)"
    const brickColor = "rgba(193, 95, 60, 0.5)"
    const dimColor = "rgba(255, 255, 255, 0.06)"
    const ballColor = "rgba(255, 255, 255, 0.8)"

    // Bricks: 4 rows × 5 cols
    const BC = 5, BR = 3, BW = 4, BH = 2
    let bricks: boolean[][] = []

    function resetBricks() {
      bricks = Array.from({ length: BR }, () => Array(BC).fill(true))
    }
    resetBricks()

    // Ball
    let bx = 12, by = 18, bdx = 1, bdy = -1
    // Paddle
    let px = 9, pw = 6

    function step() {
      // AI paddle: follow ball
      const center = px + pw / 2
      if (center < bx) px = Math.min(px + 1, W - pw)
      else if (center > bx) px = Math.max(px - 1, 0)

      bx += bdx
      by += bdy

      // Wall bounce
      if (bx <= 0 || bx >= W - 1) bdx = -bdx
      if (by <= 0) bdy = -bdy

      // Paddle bounce
      if (by >= H - 3 && bdy > 0 && bx >= px && bx <= px + pw) {
        bdy = -bdy
        // Angle based on hit position
        const hit = (bx - px) / pw
        bdx = hit < 0.33 ? -1 : hit > 0.66 ? 1 : bdx
      }

      // Ball fell — reset
      if (by >= H) {
        bx = 12; by = 18; bdx = 1; bdy = -1
        resetBricks()
      }

      // Brick collision
      for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) {
        if (!bricks[r][c]) continue
        const bkx = c * (BW + 1), bky = r * (BH + 1) + 1
        if (bx >= bkx && bx < bkx + BW && by >= bky && by < bky + BH) {
          bricks[r][c] = false
          bdy = -bdy
        }
      }

      // All bricks cleared — reset
      if (bricks.every(row => row.every(b => !b))) resetBricks()
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Bricks
      for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) {
        const bkx = c * (BW + 1), bky = r * (BH + 1) + 1
        ctx.fillStyle = bricks[r][c] ? brickColor : dimColor
        ctx.fillRect(bkx, bky, BW, BH)
      }
      // Paddle
      ctx.fillStyle = accent
      ctx.fillRect(px, H - 2, pw, 1)
      // Ball
      ctx.fillStyle = ballColor
      ctx.fillRect(bx, by, 1, 1)
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 60)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Pong ──────────────────────────────────────────────────

export class PongGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const W = 24, H = 18
    canvas.width = W
    canvas.height = H
    canvas.className = "cm-slash-game"
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext("2d")!
    const accent = "rgba(193, 95, 60, 0.9)"
    const ballColor = "rgba(255, 255, 255, 0.8)"
    const dimColor = "rgba(255, 255, 255, 0.06)"

    const PH = 5 // paddle height
    let ly = H / 2 - PH / 2, ry = H / 2 - PH / 2 // left/right paddle y
    let bx = W / 2, by = H / 2
    let bdx = (Math.random() < 0.5 ? 1 : -1), bdy = (Math.random() < 0.5 ? 0.5 : -0.5)

    function step() {
      // AI: paddles track ball with slight delay
      const lTarget = by - PH / 2
      ly += (lTarget - ly) * 0.3
      ly = Math.max(0, Math.min(H - PH, ly))

      const rTarget = by - PH / 2
      ry += (rTarget - ry) * 0.25
      ry = Math.max(0, Math.min(H - PH, ry))

      bx += bdx
      by += bdy

      // Top/bottom bounce
      if (by <= 0 || by >= H - 1) bdy = -bdy

      // Left paddle
      if (bx <= 2 && by >= ly && by <= ly + PH) {
        bdx = Math.abs(bdx)
        bdy += (Math.random() - 0.5) * 0.5
      }
      // Right paddle
      if (bx >= W - 3 && by >= ry && by <= ry + PH) {
        bdx = -Math.abs(bdx)
        bdy += (Math.random() - 0.5) * 0.5
      }

      // Score — reset
      if (bx < 0 || bx > W) {
        bx = W / 2; by = H / 2
        bdx = bx < 0 ? 1 : -1
        bdy = (Math.random() - 0.5) * 1.5
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Top and bottom walls
      ctx.fillStyle = dimColor
      for (let x = 0; x < W; x++) { ctx.fillRect(x, 0, 1, 1); ctx.fillRect(x, H - 1, 1, 1) }
      // Center line
      for (let y = 0; y < H; y += 2) { ctx.fillStyle = dimColor; ctx.fillRect(W / 2, y, 1, 1) }
      // Paddles
      ctx.fillStyle = accent
      ctx.fillRect(1, Math.round(ly), 1, PH)
      ctx.fillRect(W - 2, Math.round(ry), 1, PH)
      // Ball
      ctx.fillStyle = ballColor
      ctx.fillRect(Math.round(bx), Math.round(by), 1, 1)
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 50)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Tetris ────────────────────────────────────────────────

export class TetrisGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const COLS = 8, ROWS = 16, C = 2
    const W = COLS * C, H = ROWS * C
    canvas.width = W
    canvas.height = H
    canvas.className = "cm-slash-game"
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext("2d")!
    const accent = "rgba(193, 95, 60, 0.8)"
    const landed = "rgba(193, 95, 60, 0.4)"
    const dimColor = "rgba(255, 255, 255, 0.04)"

    const PIECES = [
      [[1,1,1,1]],                         // I
      [[1,1],[1,1]],                        // O
      [[0,1,0],[1,1,1]],                    // T
      [[1,0],[1,0],[1,1]],                  // L
      [[0,1],[0,1],[1,1]],                  // J
      [[0,1,1],[1,1,0]],                    // S
      [[1,1,0],[0,1,1]],                    // Z
    ]

    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(false))
    let piece: number[][], px: number, py: number

    function spawn() {
      piece = PIECES[Math.floor(Math.random() * PIECES.length)]
      px = Math.floor((COLS - piece[0].length) / 2)
      py = 0
    }

    function collides(dx: number, dy: number): boolean {
      for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
        if (!piece[r][c]) continue
        const nx = px + c + dx, ny = py + r + dy
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true
        if (ny >= 0 && board[ny][nx]) return true
      }
      return false
    }

    function lock() {
      for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
        if (!piece[r][c]) continue
        const ny = py + r
        if (ny >= 0 && ny < ROWS) board[ny][px + c] = true
      }
      // Clear full rows
      board = board.filter(row => !row.every(Boolean))
      while (board.length < ROWS) board.unshift(Array(COLS).fill(false))
    }

    function aiMove() {
      // Simple AI: try to move toward the column with lowest stack
      const heights = Array.from({ length: COLS }, (_, c) => {
        for (let r = 0; r < ROWS; r++) if (board[r][c]) return ROWS - r
        return 0
      })
      const pw = piece[0].length
      let bestCol = px
      let bestHeight = Infinity
      for (let c = 0; c <= COLS - pw; c++) {
        const maxH = Math.max(...Array.from({ length: pw }, (_, i) => heights[c + i]))
        if (maxH < bestHeight) { bestHeight = maxH; bestCol = c }
      }
      if (px < bestCol && !collides(1, 0)) px++
      else if (px > bestCol && !collides(-1, 0)) px--
    }

    spawn()

    function step() {
      aiMove()
      if (!collides(0, 1)) {
        py++
      } else {
        lock()
        spawn()
        // Game over — board full
        if (collides(0, 0)) {
          board = Array.from({ length: ROWS }, () => Array(COLS).fill(false))
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Board
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = board[r][c] ? landed : dimColor
        ctx.fillRect(c * C, r * C, C, C)
      }
      // Current piece
      for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
        if (!piece[r][c]) continue
        ctx.fillStyle = accent
        ctx.fillRect((px + c) * C, (py + r) * C, C, C)
      }
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 100)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Flappy Bird ───────────────────────────────────────────

export class FlappyGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const W = 24, H = 18
    canvas.width = W
    canvas.height = H
    canvas.className = "cm-slash-game"
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext("2d")!
    const birdColor = "rgba(193, 95, 60, 0.9)"
    const pipeColor = "rgba(255, 255, 255, 0.12)"
    const dimColor = "rgba(255, 255, 255, 0.04)"

    let by = H / 2, bv = 0 // bird y, velocity
    const bx = 6 // bird x (fixed)
    const gap = 6 // pipe gap size
    let pipes: { x: number; gapY: number }[] = []
    let frame = 0

    function spawnPipe() {
      const gapY = 3 + Math.floor(Math.random() * (H - gap - 6))
      pipes.push({ x: W, gapY })
    }

    spawnPipe()

    function step() {
      frame++
      // Gravity
      bv += 0.15
      by += bv

      // AI: flap when bird is below the next pipe's gap center
      const next = pipes.find(p => p.x + 2 >= bx)
      if (next) {
        const gapCenter = next.gapY + gap / 2
        if (by > gapCenter - 1) bv = -1.2
      } else if (by > H / 2) {
        bv = -1.2
      }

      // Move pipes
      for (const p of pipes) p.x -= 0.5

      // Remove off-screen pipes
      pipes = pipes.filter(p => p.x > -3)

      // Spawn new pipes
      if (frame % 20 === 0) spawnPipe()

      // Floor/ceiling
      if (by < 0) { by = 0; bv = 0 }

      // Collision or fell — reset
      let hit = by >= H - 1
      for (const p of pipes) {
        if (bx >= p.x && bx <= p.x + 2) {
          if (by < p.gapY || by > p.gapY + gap) hit = true
        }
      }
      if (hit) {
        by = H / 2; bv = 0
        pipes = []
        frame = 0
        spawnPipe()
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Background
      ctx.fillStyle = dimColor
      ctx.fillRect(0, H - 1, W, 1) // ground
      // Pipes
      for (const p of pipes) {
        ctx.fillStyle = pipeColor
        // Top pipe
        ctx.fillRect(Math.round(p.x), 0, 2, p.gapY)
        // Bottom pipe
        ctx.fillRect(Math.round(p.x), p.gapY + gap, 2, H - p.gapY - gap)
      }
      // Bird
      ctx.fillStyle = birdColor
      ctx.fillRect(bx, Math.round(by), 2, 1)
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 50)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Space Invaders ────────────────────────────────────────

export class InvadersGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const W = 24, H = 24
    canvas.width = W
    canvas.height = H
    canvas.className = "cm-slash-game"
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`

    const ctx = canvas.getContext("2d")!
    const accent = "rgba(193, 95, 60, 0.9)"
    const alienColor = "rgba(255, 255, 255, 0.3)"
    const bulletColor = "rgba(255, 255, 255, 0.8)"
    const dimColor = "rgba(255, 255, 255, 0.04)"

    const ACOLS = 5, AROWS = 3
    let aliens: { x: number; y: number; alive: boolean }[] = []
    let adir = 1 // movement direction
    let sx = W / 2 // ship x
    let bullets: { x: number; y: number }[] = []
    let frame = 0

    function spawnAliens() {
      aliens = []
      for (let r = 0; r < AROWS; r++) for (let c = 0; c < ACOLS; c++) {
        aliens.push({ x: 2 + c * 4, y: 2 + r * 3, alive: true })
      }
      adir = 1
    }
    spawnAliens()

    function step() {
      frame++
      // Move aliens
      if (frame % 8 === 0) {
        const alive = aliens.filter(a => a.alive)
        const minX = Math.min(...alive.map(a => a.x))
        const maxX = Math.max(...alive.map(a => a.x))
        if ((adir > 0 && maxX >= W - 3) || (adir < 0 && minX <= 1)) {
          adir = -adir
          for (const a of alive) a.y += 1
        } else {
          for (const a of alive) a.x += adir
        }
      }

      // AI ship: move toward nearest alive alien column
      const alive = aliens.filter(a => a.alive)
      if (alive.length === 0) { spawnAliens(); return }
      const nearest = alive.reduce((best, a) => Math.abs(a.x - sx) < Math.abs(best.x - sx) ? a : best)
      if (sx < nearest.x) sx = Math.min(sx + 1, W - 2)
      else if (sx > nearest.x) sx = Math.max(sx - 1, 1)

      // Shoot
      if (frame % 6 === 0) bullets.push({ x: sx, y: H - 3 })

      // Move bullets
      for (const b of bullets) b.y--
      bullets = bullets.filter(b => b.y > 0)

      // Hit detection
      for (const b of bullets) {
        for (const a of aliens) {
          if (a.alive && Math.abs(b.x - a.x) <= 1 && Math.abs(b.y - a.y) <= 1) {
            a.alive = false
            b.y = -1 // remove bullet
          }
        }
      }

      // Aliens reached bottom — reset
      if (alive.some(a => a.y >= H - 4)) spawnAliens()
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Ground
      ctx.fillStyle = dimColor
      ctx.fillRect(0, H - 1, W, 1)
      // Aliens
      for (const a of aliens) {
        if (!a.alive) continue
        ctx.fillStyle = alienColor
        ctx.fillRect(a.x, a.y, 2, 1)
      }
      // Ship
      ctx.fillStyle = accent
      ctx.fillRect(sx, H - 2, 2, 1)
      // Bullets
      ctx.fillStyle = bulletColor
      for (const b of bullets) ctx.fillRect(b.x, b.y, 1, 1)
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 60)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Pac-Man ───────────────────────────────────────────────

export class PacManGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const N = 11, C = 2
    const size = N * C
    canvas.width = size
    canvas.height = size
    canvas.className = "cm-slash-game"
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext("2d")!
    const wallColor = "rgba(255, 255, 255, 0.08)"
    const dotColor = "rgba(255, 255, 255, 0.15)"
    const pacColor = "rgba(193, 95, 60, 0.9)"
    const ghostColor = "rgba(255, 255, 255, 0.4)"

    // Simple maze (1 = wall, 0 = path)
    const maze = [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,0,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1],
    ]

    // Dots on every open cell
    let dots = new Set<string>()
    function resetDots() {
      dots.clear()
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!maze[y][x]) dots.add(`${x},${y}`)
      }
    }
    resetDots()

    let px = 1, py = 1, pdir = { x: 1, y: 0 }
    let gx = 9, gy = 9, gdir = { x: -1, y: 0 }

    function openDirs(x: number, y: number) {
      const dirs: { x: number; y: number }[] = []
      for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
        if (!maze[y + dy]?.[x + dx]) dirs.push({ x: dx, y: dy })
      }
      return dirs
    }

    function step() {
      // Pac-Man AI: move toward nearest dot
      const dirs = openDirs(px, py)
      if (dirs.length) {
        let best = pdir
        let bestDist = Infinity
        // Find nearest dot
        let nearestDot = { x: px, y: py }
        let nearDist = Infinity
        for (const key of dots) {
          const [dx, dy] = key.split(",").map(Number)
          const d = Math.abs(dx - px) + Math.abs(dy - py)
          if (d > 0 && d < nearDist) { nearDist = d; nearestDot = { x: dx, y: dy } }
        }
        for (const d of dirs) {
          const nx = px + d.x, ny = py + d.y
          const dist = Math.abs(nearestDot.x - nx) + Math.abs(nearestDot.y - ny)
          if (dist < bestDist) { bestDist = dist; best = d }
        }
        pdir = best
        px += pdir.x
        py += pdir.y
      }

      // Eat dot
      dots.delete(`${px},${py}`)
      if (dots.size === 0) resetDots()

      // Ghost AI: chase pac-man with some randomness
      const gdirs = openDirs(gx, gy)
      if (gdirs.length) {
        // Don't reverse
        const forward = gdirs.filter(d => !(d.x === -gdir.x && d.y === -gdir.y))
        const choices = forward.length ? forward : gdirs
        // Mostly chase, sometimes random
        if (Math.random() < 0.7) {
          let best = gdir, bestDist = Infinity
          for (const d of choices) {
            const dist = Math.abs(px - (gx + d.x)) + Math.abs(py - (gy + d.y))
            if (dist < bestDist) { bestDist = dist; best = d }
          }
          gdir = best
        } else {
          gdir = choices[Math.floor(Math.random() * choices.length)]
        }
        gx += gdir.x
        gy += gdir.y
      }

      // Ghost caught pac-man — reset
      if (gx === px && gy === py) {
        px = 1; py = 1; gx = 9; gy = 9
        pdir = { x: 1, y: 0 }; gdir = { x: -1, y: 0 }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, size, size)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (maze[y][x]) { ctx.fillStyle = wallColor; ctx.fillRect(x * C, y * C, C, C) }
      }
      // Dots
      ctx.fillStyle = dotColor
      for (const key of dots) {
        const [dx, dy] = key.split(",").map(Number)
        ctx.fillRect(dx * C, dy * C + 1, 1, 1)
      }
      // Pac-Man
      ctx.fillStyle = pacColor
      ctx.fillRect(px * C, py * C, C, C)
      // Ghost
      ctx.fillStyle = ghostColor
      ctx.fillRect(gx * C, gy * C, C, C)
    }

    draw()
    const interval = setInterval(() => { step(); draw() }, 120)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

// ─── Random picker ─────────────────────────────────────────

// ─── Minesweeper ───────────────────────────────────────────

export class MinesweeperGame extends WidgetType {
  toDOM() {
    const canvas = document.createElement("canvas")
    const N = 8, C = 3
    const size = N * C
    canvas.width = size
    canvas.height = size
    canvas.className = "cm-slash-game"
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext("2d")!
    const hidden = "rgba(255, 255, 255, 0.08)"
    const revealed = "rgba(255, 255, 255, 0.02)"
    const accent = "rgba(193, 95, 60, 0.9)"
    const mineColor = "rgba(255, 80, 80, 0.7)"
    const numColors = [
      "", // 0 = no number
      "rgba(100, 150, 255, 0.7)", // 1
      "rgba(80, 180, 80, 0.7)",   // 2
      "rgba(220, 80, 80, 0.7)",   // 3
      "rgba(150, 80, 200, 0.7)",  // 4+
    ]

    const MINES = 8
    let mines: boolean[][]
    let counts: number[][]
    let revealedCells: boolean[][]
    let flagged: boolean[][]
    let gameOver: boolean
    let revealQueue: { x: number; y: number }[]

    function init() {
      mines = Array.from({ length: N }, () => Array(N).fill(false))
      counts = Array.from({ length: N }, () => Array(N).fill(0))
      revealedCells = Array.from({ length: N }, () => Array(N).fill(false))
      flagged = Array.from({ length: N }, () => Array(N).fill(false))
      gameOver = false
      revealQueue = []

      // Place mines
      let placed = 0
      while (placed < MINES) {
        const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N)
        if (!mines[y][x]) { mines[y][x] = true; placed++ }
      }

      // Compute counts
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (mines[y][x]) continue
        let c = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < N && ny >= 0 && ny < N && mines[ny][nx]) c++
        }
        counts[y][x] = c
      }

      // Build reveal queue (AI plays: pick safe cells)
      const safe: { x: number; y: number }[] = []
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        if (!mines[y][x]) safe.push({ x, y })
      }
      // Shuffle
      for (let i = safe.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[safe[i], safe[j]] = [safe[j], safe[i]]
      }
      revealQueue = safe
    }

    init()
    let step = 0

    function reveal(x: number, y: number) {
      if (revealedCells[y][x]) return
      revealedCells[y][x] = true
      // Flood fill for zeros
      if (counts[y][x] === 0) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx >= 0 && nx < N && ny >= 0 && ny < N && !mines[ny][nx]) reveal(nx, ny)
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, size, size)
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const px = x * C, py = y * C
        if (gameOver && mines[y][x]) {
          ctx.fillStyle = mineColor
          ctx.fillRect(px, py, C - 1, C - 1)
        } else if (revealedCells[y][x]) {
          ctx.fillStyle = revealed
          ctx.fillRect(px, py, C - 1, C - 1)
          if (counts[y][x] > 0) {
            ctx.fillStyle = numColors[Math.min(counts[y][x], 4)]
            ctx.fillRect(px + 1, py + 1, 1, 1)
          }
        } else {
          ctx.fillStyle = hidden
          ctx.fillRect(px, py, C - 1, C - 1)
        }
      }
      // Cursor on next cell to reveal
      if (!gameOver && step < revealQueue.length) {
        const { x, y } = revealQueue[step]
        ctx.fillStyle = accent
        ctx.fillRect(x * C, y * C, C - 1, C - 1)
      }
    }

    draw()
    const interval = setInterval(() => {
      if (gameOver) {
        // Pause then restart
        setTimeout(() => { init(); step = 0; draw() }, 500)
        gameOver = false
        return
      }
      if (step < revealQueue.length) {
        const { x, y } = revealQueue[step]
        reveal(x, y)
        step++
      } else {
        // All safe cells revealed — show mines briefly then reset
        gameOver = true
      }
      draw()
    }, 80)
    ;(canvas as any)._interval = interval
    return canvas
  }

  destroy(dom: HTMLElement) { clearInterval((dom as any)._interval) }
  ignoreEvent() { return true }
}

const games = [SnakeGame, MazeGame, LifeGame, BreakoutGame, PongGame, TetrisGame, FlappyGame, InvadersGame, PacManGame, MinesweeperGame]

export function randomGame(): WidgetType {
  const Game = games[Math.floor(Math.random() * games.length)]
  return new Game()
}
