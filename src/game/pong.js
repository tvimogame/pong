// Pure Pong game logic — no React, no DOM. Deterministic (injectable RNG) and
// fully unit-testable. All positions are in field pixels (see FIELD_W/FIELD_H).

export const FIELD_W = 800
export const FIELD_H = 500

export const PADDLE_W = 14
export const PADDLE_H = 90
export const BALL_R = 9
export const PADDLE_GAP = 26

export const PLAYER_PADDLE_X = PADDLE_GAP
export const AI_PADDLE_X = FIELD_W - PADDLE_GAP - PADDLE_W

export const START_SPEED = 320
export const MAX_SPEED = 850
export const SPEEDUP_PER_HIT = 1.04
export const MAX_BOUNCE_ANGLE = Math.PI / 3 // 60 degrees
export const PLAYER_SPEED = 520

export const CLASSIC_TARGET = 10
export const BLITZ_TIME = 90
export const BLITZ_RAMP = 20 // final 20s the ball accelerates
export const SURVIVAL_STEP = 20 // every 20s the AI improves / ball speeds up

export const GOAL_PAUSE = 0.7
export const SERVE_TIME = 0.7

export const AI_PRESETS = {
  easy: { reaction: 0.22, speedFactor: 0.75, error: 60 },
  normal: { reaction: 0.14, speedFactor: 0.9, error: 35 },
  hard: { reaction: 0.08, speedFactor: 1.05, error: 15 },
}

export const BONUS_TYPES = {
  big: { color: '#00e676', label: 'Увеличенная ракетка', weight: 3 },
  shrink: { color: '#c93dff', label: 'Маленькая ракетка соперника', weight: 3 },
  speed: { color: '#ffd600', label: 'Ускорение мяча', weight: 3 },
  slow: { color: '#3d7bff', label: 'Замедление', weight: 3 },
  multiball: { color: '#ff9100', label: 'Multi Ball', weight: 1 },
}
export const BONUS_LIFE = 7
export const BONUS_R = 15

// effect durations (seconds)
export const EFF_BIG = 8
export const EFF_SHRINK = 7
export const EFF_SLOW = 5

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v)
const rand = (min, max, rng) => min + rng() * (max - min)

function makeBall(x, y, vx, vy, speed) {
  return { x, y, vx, vy, speed }
}

export function createGame({
  mode = 'classic',
  difficulty = 'normal',
  bonusesEnabled = true,
  soundOn = true,
} = {}) {
  return {
    phase: 'menu', // menu | serving | rally | goal | paused | over
    resumePhase: 'rally',
    mode,
    difficulty,
    bonusesEnabled,
    soundOn,
    t: 0,
    playerY: FIELD_H / 2,
    aiY: FIELD_H / 2,
    playerVelY: 0,
    aiVelY: 0,
    ai: { clock: 0, target: FIELD_H / 2 },
    balls: [],
    trail: [],
    playerScore: 0,
    aiScore: 0,
    combo: 0,
    maxCombo: 0,
    comboFlash: null, // { n, key }
    lastHitter: null,
    goal: null, // { by, key }
    result: null, // 'win' | 'lose' | 'draw'
    bonusIdCounter: 1,
    bonuses: [],
    nextBonusIn: rand(10, 18, Math.random),
    playerBigUntil: 0,
    aiBigUntil: 0,
    playerShrinkUntil: 0,
    aiShrinkUntil: 0,
    slowUntil: 0,
    playerHitUntil: 0,
    aiHitUntil: 0,
    blitzLeft: BLITZ_TIME,
    survivalTime: 0,
    displaySpeed: START_SPEED,
    maxSpeedReached: START_SPEED,
    goalKey: 0,
  }
}

// Place the (single) ball in the centre with a random horizontal direction and
// a small random vertical angle. Also clears any extra (multi) balls.
export function serveBall(game, rng = Math.random) {
  const dir = rng() < 0.5 ? -1 : 1
  const angle = (rng() * 2 - 1) * (Math.PI / 8)
  const speed = START_SPEED
  game.balls = [makeBall(FIELD_W / 2, FIELD_H / 2, dir * speed * Math.cos(angle), speed * Math.sin(angle), speed)]
  game.trail = []
  game.lastHitter = null
  game.displaySpeed = START_SPEED
  return game
}

// Reset the match and prepare the first serve.
export function beginMatch(game, rng = Math.random) {
  game.playerY = FIELD_H / 2
  game.aiY = FIELD_H / 2
  game.playerVelY = 0
  game.aiVelY = 0
  game.ai = { clock: 0, target: FIELD_H / 2 }
  game.playerScore = 0
  game.aiScore = 0
  game.combo = 0
  game.maxCombo = 0
  game.comboFlash = null
  game.goal = null
  game.result = null
  game.bonusIdCounter = 1
  game.bonuses = []
  game.nextBonusIn = rand(10, 18, rng)
  game.playerBigUntil = 0
  game.aiBigUntil = 0
  game.playerShrinkUntil = 0
  game.aiShrinkUntil = 0
  game.slowUntil = 0
  game.playerHitUntil = 0
  game.aiHitUntil = 0
  game.blitzLeft = BLITZ_TIME
  game.survivalTime = 0
  game.maxSpeedReached = START_SPEED
  game.displaySpeed = START_SPEED
  game.t = 0
  serveBall(game, rng)
  game.phase = 'serving'
  game.serveTimer = SERVE_TIME
  return game
}

export function playerHeight(game) {
  let h = PADDLE_H
  if (game.t < game.playerBigUntil) h *= 1.5
  if (game.t < game.playerShrinkUntil) h *= 0.65
  return h
}

export function aiHeight(game) {
  let h = PADDLE_H
  if (game.t < game.aiBigUntil) h *= 1.5
  if (game.t < game.aiShrinkUntil) h *= 0.65
  return h
}

function updatePlayerPaddle(game, dt, input) {
  const before = game.playerY
  if (input.targetY != null) {
    game.playerY = input.targetY
  } else {
    let dir = 0
    if (input.up) dir -= 1
    if (input.down) dir += 1
    game.playerY = before + dir * PLAYER_SPEED * dt
  }
  const h = playerHeight(game)
  game.playerY = clamp(game.playerY, h / 2, FIELD_H - h / 2)
  game.playerVelY = dt > 0 ? (game.playerY - before) / dt : 0
}

function predictBallY(game, ball) {
  let { x, y, vx, vy } = ball
  const targetX = AI_PADDLE_X
  const step = 16
  let guard = 0
  while (x < targetX && guard++ < 2000) {
    x += (vx * step) / 1000
    y += (vy * step) / 1000
    if (y < BALL_R) {
      y = BALL_R
      vy = -vy
    } else if (y > FIELD_H - BALL_R) {
      y = FIELD_H - BALL_R
      vy = -vy
    }
  }
  return y
}

function updateAI(game, dt, rng) {
  const preset = AI_PRESETS[game.difficulty] || AI_PRESETS.normal
  const level = game.mode === 'survival' ? Math.floor(game.survivalTime / SURVIVAL_STEP) : 0
  const error = Math.max(8, preset.error - level * 8)
  const speedFactor = Math.min(1.5, preset.speedFactor + level * 0.06)
  const reaction = Math.max(0.05, preset.reaction - level * 0.02)

  const ai = game.ai
  ai.clock += dt
  if (ai.clock >= reaction) {
    ai.clock = 0
    const ball = game.balls[0]
    let target = FIELD_H / 2
    if (ball && ball.vx > 0) {
      target = predictBallY(game, ball) + (rng() * 2 - 1) * error
    }
    const h = aiHeight(game)
    ai.target = clamp(target, h / 2, FIELD_H - h / 2)
  }

  const before = game.aiY
  const speed = PLAYER_SPEED * speedFactor
  const dy = ai.target - game.aiY
  const maxMove = speed * dt
  if (Math.abs(dy) <= maxMove) game.aiY = ai.target
  else game.aiY += Math.sign(dy) * maxMove
  const h = aiHeight(game)
  game.aiY = clamp(game.aiY, h / 2, FIELD_H - h / 2)
  game.aiVelY = dt > 0 ? (game.aiY - before) / dt : 0
}

function effectiveSpeed(game, ball) {
  let s = ball.speed
  if (game.t < game.slowUntil) s *= 0.75
  if (game.mode === 'blitz' && game.blitzLeft <= BLITZ_RAMP) {
    s *= 1 + (1 - game.blitzLeft / BLITZ_RAMP) * 0.5
  }
  if (game.mode === 'survival') {
    s *= 1 + Math.floor(game.survivalTime / SURVIVAL_STEP) * 0.12
  }
  return Math.min(MAX_SPEED, s)
}

function reflectPaddle(game, ball, side, crossY, events) {
  const height = side === 'player' ? playerHeight(game) : aiHeight(game)
  const center = side === 'player' ? game.playerY : game.aiY
  const halfH = height / 2 + BALL_R
  const offset = clamp(crossY - center, -halfH, halfH) / halfH
  const angle = offset * MAX_BOUNCE_ANGLE
  const speed = Math.min(MAX_SPEED, ball.speed * SPEEDUP_PER_HIT)
  ball.speed = speed
  game.maxSpeedReached = Math.max(game.maxSpeedReached, speed)
  const dir = side === 'player' ? 1 : -1
  const vel = side === 'player' ? game.playerVelY : game.aiVelY
  let vy = speed * Math.sin(angle) + vel * 0.18
  const vx = dir * speed * Math.cos(angle)
  const maxVy = speed * 0.92
  vy = clamp(vy, -maxVy, maxVy)
  ball.vx = vx
  ball.vy = vy
  if (side === 'player') {
    ball.x = PLAYER_PADDLE_X + PADDLE_W + BALL_R + 0.5
    game.lastHitter = 'player'
    game.playerHitUntil = game.t + 0.18
    game.combo += 1
    game.maxCombo = Math.max(game.maxCombo, game.combo)
    if (game.combo % 10 === 0) {
      game.comboFlash = { n: game.combo, key: (game.goalKey = game.goalKey + 1) }
      events.push('combo')
    }
  } else {
    ball.x = AI_PADDLE_X - BALL_R - 0.5
    game.lastHitter = 'ai'
    game.aiHitUntil = game.t + 0.18
  }
  events.push('paddle')
}

// Swept test: does the ball's centre-line cross the paddle face between
// (sx, sy) and (x, y)? Returns the crossing Y if it lands on the paddle.
function paddleCrossing(game, ball, side, sx, sy) {
  const center = side === 'player' ? game.playerY : game.aiY
  const halfH = (side === 'player' ? playerHeight(game) : aiHeight(game)) / 2 + BALL_R
  if (side === 'player') {
    if (ball.vx >= 0) return null
    const face = PLAYER_PADDLE_X + PADDLE_W
    const a = sx - BALL_R
    const b = ball.x - BALL_R
    if (b > face) return null
    const t = (face - a) / (b - a)
    if (t < 0 || t > 1) return null
    const cy = sy + (ball.y - sy) * t
    return cy >= center - halfH && cy <= center + halfH ? cy : null
  }
  if (ball.vx <= 0) return null
  const face = AI_PADDLE_X
  const a = sx + BALL_R
  const b = ball.x + BALL_R
  if (b < face) return null
  const t = (face - a) / (b - a)
  if (t < 0 || t > 1) return null
  const cy = sy + (ball.y - sy) * t
  return cy >= center - halfH && cy <= center + halfH ? cy : null
}

function scoreGoal(game, scorer, rng, events) {
  if (scorer === 'player') game.playerScore += 1
  else game.aiScore += 1
  if (scorer === 'ai') {
    game.combo = 0
    game.comboFlash = null
  }

  if (game.mode === 'survival') {
    if (scorer === 'ai') {
      game.result = 'lose'
      game.phase = 'over'
      events.push('goal', 'over')
    } else {
      // AI missed — the rally simply continues
      serveBall(game, rng)
      game.phase = 'serving'
      game.serveTimer = SERVE_TIME
      events.push('goal')
    }
    return
  }

  game.goal = { by: scorer, key: (game.goalKey = game.goalKey + 1) }
  game.phase = 'goal'
  game.goalTimer = GOAL_PAUSE
  events.push('goal')

  if (game.mode === 'classic') {
    if (game.playerScore >= CLASSIC_TARGET) game.result = 'win'
    else if (game.aiScore >= CLASSIC_TARGET) game.result = 'lose'
  }
}

function updateBalls(game, dt, rng, events) {
  const maxStep = 18
  for (const ball of game.balls) {
    const eff = effectiveSpeed(game, ball)
    game.displaySpeed = eff
    const cur = Math.hypot(ball.vx, ball.vy) || 1
    const scale = eff / cur
    ball.vx *= scale
    ball.vy *= scale

    const dist = eff * dt
    const steps = Math.max(1, Math.ceil(dist / maxStep))
    const subDt = dt / steps
    let scored = null
    for (let i = 0; i < steps && !scored; i += 1) {
      const sx = ball.x
      const sy = ball.y
      ball.x += ball.vx * subDt
      ball.y += ball.vy * subDt

      if (ball.y - BALL_R < 0) {
        ball.y = BALL_R
        ball.vy = -ball.vy
        events.push('wall')
      } else if (ball.y + BALL_R > FIELD_H) {
        ball.y = FIELD_H - BALL_R
        ball.vy = -ball.vy
        events.push('wall')
      }

      if (ball.vx < 0) {
        const cy = paddleCrossing(game, ball, 'player', sx, sy)
        if (cy != null) reflectPaddle(game, ball, 'player', cy, events)
      } else if (ball.vx > 0) {
        const cy = paddleCrossing(game, ball, 'ai', sx, sy)
        if (cy != null) reflectPaddle(game, ball, 'ai', cy, events)
      }

      if (ball.x < -BALL_R) scored = 'ai'
      else if (ball.x > FIELD_W + BALL_R) scored = 'player'
    }
    if (scored) {
      scoreGoal(game, scored, rng, events)
      return true
    }
  }
  return false
}

function pickBonusType(rng) {
  const types = Object.keys(BONUS_TYPES)
  const weights = types.map((t) => BONUS_TYPES[t].weight)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < types.length; i += 1) {
    if (r < weights[i]) return types[i]
    r -= weights[i]
  }
  return types[0]
}

function spawnBonus(game, rng) {
  game.bonuses.push({
    id: game.bonusIdCounter,
    type: pickBonusType(rng),
    x: rand(FIELD_W * 0.32, FIELD_W * 0.68, rng),
    y: rand(70, FIELD_H - 70, rng),
    life: BONUS_LIFE,
  })
  game.bonusIdCounter += 1
}

function applyBonus(game, type, side, events) {
  if (side == null) side = 'player'
  switch (type) {
    case 'big':
      if (side === 'player') game.playerBigUntil = game.t + EFF_BIG
      else game.aiBigUntil = game.t + EFF_BIG
      break
    case 'shrink':
      if (side === 'player') game.aiShrinkUntil = game.t + EFF_SHRINK
      else game.playerShrinkUntil = game.t + EFF_SHRINK
      break
    case 'speed':
      for (const b of game.balls) b.speed = Math.min(MAX_SPEED, b.speed * 1.25)
      game.maxSpeedReached = Math.max(game.maxSpeedReached, game.balls[0] ? game.balls[0].speed : 0)
      events.push('speedflash')
      break
    case 'slow':
      game.slowUntil = game.t + EFF_SLOW
      break
    case 'multiball': {
      const base = game.balls[0]
      if (base && game.balls.length < 3) {
        for (let i = 0; i < 2; i += 1) {
          const a = (i === 0 ? -1 : 1) * (Math.PI / 5)
          game.balls.push(makeBall(base.x, base.y, Math.cos(a) * base.speed, Math.sin(a) * base.speed, base.speed))
        }
      }
      break
    }
    default:
      break
  }
  events.push('bonus')
}

function updateBonuses(game, dt, rng, events) {
  if (game.bonusesEnabled && game.phase === 'rally') {
    game.nextBonusIn -= dt
    if (game.nextBonusIn <= 0 && game.bonuses.length < 2) {
      spawnBonus(game, rng)
      game.nextBonusIn = rand(10, 18, rng)
    }
  }

  for (const b of game.bonuses) b.life -= dt
  game.bonuses = game.bonuses.filter((b) => b.life > 0)

  if (game.phase === 'rally' && game.bonuses.length > 0) {
    const ball = game.balls[0]
    if (ball) {
      const hit = game.bonuses.find((b) => Math.hypot(ball.x - b.x, ball.y - b.y) < BALL_R + BONUS_R)
      if (hit) {
        game.bonuses = game.bonuses.filter((b) => b.id !== hit.id)
        applyBonus(game, hit.type, game.lastHitter, events)
      }
    }
  }
}

function pushTrail(game) {
  const ball = game.balls[0]
  if (!ball) return
  game.trail.push({ x: ball.x, y: ball.y })
  if (game.trail.length > 5) game.trail.shift()
}

// Advance the simulation by dt seconds. Mutates `game` and returns the list of
// sound / event names that occurred this step.
export function stepGame(game, dt, input = {}, rng = Math.random) {
  const events = []
  if (game.phase === 'menu' || game.phase === 'over' || game.phase === 'paused') return events
  dt = Math.min(Math.max(dt, 0), 0.05)
  if (dt === 0) return events

  game.t += dt

  if (game.mode === 'survival') game.survivalTime += dt
  if (game.mode === 'blitz') {
    game.blitzLeft = Math.max(0, game.blitzLeft - dt)
    if (game.blitzLeft <= 0) {
      game.result = game.playerScore > game.aiScore ? 'win' : game.aiScore > game.playerScore ? 'lose' : 'draw'
      game.phase = 'over'
      events.push('over')
      return events
    }
  }

  if (game.phase === 'goal') {
    game.goalTimer -= dt
    if (game.goalTimer <= 0) {
      if (game.result) {
        game.phase = 'over'
        events.push(game.result === 'win' ? 'win' : 'lose')
      } else {
        serveBall(game, rng)
        game.phase = 'serving'
        game.serveTimer = SERVE_TIME
      }
    }
  } else if (game.phase === 'serving') {
    game.serveTimer -= dt
    if (game.serveTimer <= 0) game.phase = 'rally'
  }

  updatePlayerPaddle(game, dt, input)
  updateAI(game, dt, rng)

  if (game.phase === 'rally') {
    updateBalls(game, dt, rng, events)
    pushTrail(game)
    updateBonuses(game, dt, rng, events)
  }

  return events
}
