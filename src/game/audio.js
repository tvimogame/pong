// Minimal retro-arcade sound effects generated with the Web Audio API.
// No external audio files. Every call is safe to invoke (no-op when muted or
// when the AudioContext is unavailable).

let ctx = null

function ensureCtx() {
  if (ctx) return ctx
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
  if (!AC) return null
  ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function beep(freq, dur, type = 'square', gain = 0.05, delay = 0) {
  const c = ensureCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(g)
  g.connect(c.destination)
  const t = c.currentTime + delay
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.start(t)
  osc.stop(t + dur)
}

export function playSound(name, on = true) {
  if (!on) return
  try {
    switch (name) {
      case 'paddle':
        beep(460, 0.06, 'square', 0.06)
        break
      case 'wall':
        beep(220, 0.05, 'square', 0.045)
        break
      case 'goal':
        beep(330, 0.09, 'triangle', 0.06)
        beep(220, 0.14, 'triangle', 0.05, 0.09)
        break
      case 'bonus':
        beep(660, 0.07, 'sine', 0.06)
        beep(990, 0.07, 'sine', 0.05, 0.06)
        break
      case 'combo':
        beep(520, 0.06, 'square', 0.05)
        beep(780, 0.08, 'square', 0.05, 0.05)
        break
      case 'speedflash':
        beep(880, 0.06, 'sawtooth', 0.04)
        break
      case 'win':
        ;[523, 659, 784, 1047].forEach((f, i) => beep(f, 0.13, 'square', 0.06, i * 0.09))
        break
      case 'lose':
        ;[330, 262, 196, 147].forEach((f, i) => beep(f, 0.16, 'sawtooth', 0.05, i * 0.11))
        break
      case 'resume':
        beep(440, 0.04, 'sine', 0.04)
        break
      default:
        break
    }
  } catch {
    // ignore audio errors
  }
}
