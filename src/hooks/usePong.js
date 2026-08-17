import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createGame,
  beginMatch,
  stepGame,
  playerHeight,
  aiHeight,
  FIELD_W,
  FIELD_H,
  PADDLE_W,
  START_SPEED,
  PLAYER_PADDLE_X,
  AI_PADDLE_X,
  BONUS_TYPES,
} from '../game/pong.js'
import { playSound } from '../game/audio.js'

const BEST_KEYS = {
  classic: 'pong_classic_best',
  blitz: 'pong_blitz_best',
  survival: 'pong_survival_best',
  combo: 'pong_combo_best',
}
const SOUND_KEY = 'pong_sound'

function readNumber(key) {
  try {
    const v = localStorage.getItem(key)
    if (v == null) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function loadBest() {
  return {
    classic: readNumber(BEST_KEYS.classic),
    blitz: readNumber(BEST_KEYS.blitz),
    survival: readNumber(BEST_KEYS.survival),
    combo: readNumber(BEST_KEYS.combo),
  }
}

function persistBest(best) {
  try {
    if (best.classic != null) localStorage.setItem(BEST_KEYS.classic, String(best.classic))
    if (best.blitz != null) localStorage.setItem(BEST_KEYS.blitz, String(best.blitz))
    if (best.survival != null) localStorage.setItem(BEST_KEYS.survival, String(best.survival))
    if (best.combo != null) localStorage.setItem(BEST_KEYS.combo, String(best.combo))
  } catch {
    // ignore
  }
}

function loadSound() {
  try {
    return localStorage.getItem(SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

const quant = (v) => Math.round(v * 10) / 10

function makeField(g) {
  return {
    player: { cx: PLAYER_PADDLE_X + PADDLE_W / 2, cy: g.playerY, h: playerHeight(g), hit: g.t < g.playerHitUntil },
    ai: { cx: AI_PADDLE_X + PADDLE_W / 2, cy: g.aiY, h: aiHeight(g), hit: g.t < g.aiHitUntil },
    balls: g.balls.map((b) => ({ cx: b.x, cy: b.y })),
    trail: g.trail.map((t) => ({ x: t.x, y: t.y })),
    bonuses: g.bonuses.map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      type: b.type,
      color: BONUS_TYPES[b.type].color,
      blink: b.life < 1.8,
    })),
  }
}

function makeUi(g) {
  return {
    phase: g.phase,
    mode: g.mode,
    difficulty: g.difficulty,
    bonusesEnabled: g.bonusesEnabled,
    playerScore: g.playerScore,
    aiScore: g.aiScore,
    combo: g.combo,
    maxCombo: g.maxCombo,
    comboFlash: g.comboFlash,
    result: g.result,
    goal: g.goal,
    speedNorm: quant(g.displaySpeed / START_SPEED),
    blitzLeft: g.mode === 'blitz' ? Math.ceil(g.blitzLeft) : null,
    survivalTime: g.mode === 'survival' ? Math.floor(g.survivalTime) : null,
    maxSpeedReached: Math.round(g.maxSpeedReached),
  }
}

function uiKey(g) {
  return [
    g.phase,
    g.mode,
    g.difficulty,
    g.bonusesEnabled,
    g.playerScore,
    g.aiScore,
    g.combo,
    g.maxCombo,
    g.result,
    g.goal ? g.goal.key : 0,
    quant(g.displaySpeed / START_SPEED),
    g.mode === 'blitz' ? Math.ceil(g.blitzLeft) : '',
    g.mode === 'survival' ? Math.floor(g.survivalTime) : '',
    g.comboFlash ? g.comboFlash.key : 0,
  ].join('|')
}

function fieldKey(g) {
  const b = g.balls[0]
  return [
    g.phase,
    b ? `${b.x.toFixed(1)}/${b.y.toFixed(1)}` : '',
    g.playerY.toFixed(1),
    g.aiY.toFixed(1),
    g.bonuses.length,
    g.trail.length,
    g.playerScore,
    g.aiScore,
    g.t < g.playerHitUntil,
    g.t < g.aiHitUntil,
  ].join('|')
}

export function usePong() {
  const gameRef = useRef(null)
  if (!gameRef.current) gameRef.current = createGame({ mode: 'classic', difficulty: 'normal', bonusesEnabled: true, soundOn: true })

  const inputRef = useRef({ up: false, down: false, targetY: null })
  const bestRef = useRef(loadBest())
  const soundRef = useRef(loadSound())
  const prevPhaseRef = useRef('menu')
  const lastUiKeyRef = useRef('')
  const lastFieldKeyRef = useRef('')

  const [field, setField] = useState(() => makeField(gameRef.current))
  const [ui, setUi] = useState(() => makeUi(gameRef.current))
  const [best, setBest] = useState(() => bestRef.current)
  const [soundOn, setSoundOn] = useState(() => soundRef.current)

  const sync = useCallback((g) => {
    lastUiKeyRef.current = ''
    lastFieldKeyRef.current = ''
    setField(makeField(g))
    setUi(makeUi(g))
  }, [])

  const saveRecords = useCallback((g) => {
    const b = { ...bestRef.current }
    let changed = false
    if (g.mode === 'classic' && g.result === 'win') {
      if (b.classic == null || g.aiScore < b.classic) {
        b.classic = g.aiScore
        changed = true
      }
    } else if (g.mode === 'blitz') {
      if (b.blitz == null || g.playerScore > b.blitz) {
        b.blitz = g.playerScore
        changed = true
      }
    } else if (g.mode === 'survival') {
      const t = Math.floor(g.survivalTime)
      if (b.survival == null || t > b.survival) {
        b.survival = t
        changed = true
      }
    }
    if (g.maxCombo > 0 && (b.combo == null || g.maxCombo > b.combo)) {
      b.combo = g.maxCombo
      changed = true
    }
    if (changed) {
      bestRef.current = b
      setBest(b)
      persistBest(b)
    }
  }, [])

  // main loop --------------------------------------------------------------
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now) => {
      const g = gameRef.current
      const dt = (now - last) / 1000
      last = now
      const events = stepGame(g, dt, inputRef.current)
      for (const e of events) handleEvent(e)
      if (g.phase === 'over' && prevPhaseRef.current !== 'over') {
        saveRecords(g)
        playSound(g.result === 'win' ? 'win' : 'lose', soundRef.current)
      }
      prevPhaseRef.current = g.phase
      const fk = fieldKey(g)
      if (fk !== lastFieldKeyRef.current) {
        lastFieldKeyRef.current = fk
        setField(makeField(g))
      }
      const uk = uiKey(g)
      if (uk !== lastUiKeyRef.current) {
        lastUiKeyRef.current = uk
        setUi(makeUi(g))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleEvent(e) {
    const on = soundRef.current
    if (e === 'paddle') playSound('paddle', on)
    else if (e === 'wall') playSound('wall', on)
    else if (e === 'goal') playSound('goal', on)
    else if (e === 'bonus') playSound('bonus', on)
    else if (e === 'combo') playSound('combo', on)
    else if (e === 'speedflash') playSound('speedflash', on)
  }

  // controls ----------------------------------------------------------------
  const start = useCallback(
    (cfg) => {
      const g = createGame({
        mode: cfg.mode,
        difficulty: cfg.difficulty,
        bonusesEnabled: cfg.bonuses,
        soundOn: soundRef.current,
      })
      beginMatch(g)
      gameRef.current = g
      prevPhaseRef.current = 'serving'
      sync(g)
    },
    [sync],
  )

  const restart = useCallback(() => {
    const g = gameRef.current
    if (g.phase === 'menu') return
    beginMatch(g)
    sync(g)
  }, [sync])

  const goMenu = useCallback(() => {
    const g = gameRef.current
    g.phase = 'menu'
    sync(g)
  }, [sync])

  const togglePause = useCallback(() => {
    const g = gameRef.current
    if (g.phase === 'paused') {
      g.phase = g.resumePhase || 'rally'
      playSound('resume', soundRef.current)
    } else if (g.phase === 'serving' || g.phase === 'rally' || g.phase === 'goal') {
      g.resumePhase = g.phase
      g.phase = 'paused'
    }
    sync(g)
  }, [sync])

  const toggleSound = useCallback(() => {
    const next = !soundRef.current
    soundRef.current = next
    gameRef.current.soundOn = next
    setSoundOn(next)
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
    sync(gameRef.current)
  }, [sync])

  const movePlayerTo = useCallback((y) => {
    inputRef.current.targetY = y
  }, [])

  const clearTouch = useCallback(() => {
    inputRef.current.targetY = null
  }, [])

  // keyboard ----------------------------------------------------------------
  useEffect(() => {
    const down = (e) => {
      const k = e.key.toLowerCase()
      if (['w', 'arrowup', 's', 'arrowdown', ' ', 'r'].includes(k)) e.preventDefault()
      if (k === 'w' || k === 'arrowup') inputRef.current.up = true
      else if (k === 's' || k === 'arrowdown') inputRef.current.down = true
      else if (k === ' ') togglePause()
      else if (k === 'r') restart()
    }
    const up = (e) => {
      const k = e.key.toLowerCase()
      if (k === 'w' || k === 'arrowup') inputRef.current.up = false
      else if (k === 's' || k === 'arrowdown') inputRef.current.down = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [togglePause, restart])

  // expose a test/debug handle
  useEffect(() => {
    const g = () => gameRef.current
    window.__pong = {
      state: g,
      start: (cfg) => start(cfg),
      restart: () => restart(),
      togglePause: () => togglePause(),
      debug: {
        setBall: (b) => {
          if (g().balls[0]) Object.assign(g().balls[0], b)
        },
        setPlayerY: (y) => {
          g().playerY = y
        },
        setAiY: (y) => {
          g().aiY = y
        },
        setScores: (p, a) => {
          g().playerScore = p
          g().aiScore = a
        },
        spawnBonus: (type, x = FIELD_W / 2, y = FIELD_H / 2) => {
          const game = g()
          game.bonuses.push({ id: game.bonusIdCounter, type, x, y, life: 7 })
          game.bonusIdCounter += 1
        },
        clearBonuses: () => {
          g().bonuses = []
        },
        setPhase: (p) => {
          g().phase = p
        },
        setBlitzLeft: (t) => {
          g().blitzLeft = t
        },
        setSurvivalTime: (t) => {
          g().survivalTime = t
        },
        setLastHitter: (s) => {
          g().lastHitter = s
        },
        clearEffects: () => {
          const game = g()
          game.playerBigUntil = 0
          game.aiBigUntil = 0
          game.playerShrinkUntil = 0
          game.aiShrinkUntil = 0
          game.slowUntil = 0
        },
      },
    }
    return () => {
      delete window.__pong
    }
  }, [start, restart, togglePause])

  return {
    field,
    ui,
    best,
    soundOn,
    start,
    restart,
    goMenu,
    togglePause,
    toggleSound,
    movePlayerTo,
    clearTouch,
  }
}
