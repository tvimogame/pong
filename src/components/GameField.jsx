import { useEffect, useRef } from 'react'
import { FIELD_W, FIELD_H, BALL_R, PADDLE_W } from '../game/pong.js'

const pct = (v, total) => `${(v / total) * 100}%`

export default function GameField({ field, ui, movePlayerTo, clearTouch, children }) {
  const fieldRef = useRef(null)

  useEffect(() => {
    const el = fieldRef.current
    if (!el) return undefined
    const update = () => {
      const w = el.getBoundingClientRect().width
      if (w > 0) el.style.setProperty('--scale', String(w / FIELD_W))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const trackPointer = (e) => {
    const el = fieldRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - rect.left
    if (relX > rect.width / 2) return
    const y = ((e.clientY - rect.top) / rect.height) * FIELD_H
    movePlayerTo(y)
  }

  const onPointerDown = (e) => {
    if (ui.phase !== 'serving' && ui.phase !== 'rally' && ui.phase !== 'goal') return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    trackPointer(e)
  }
  const onPointerMove = (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return
    trackPointer(e)
  }

  const goalText = ui.goal && ui.goal.by === 'player' ? 'POINT!' : 'MISS!'
  const goalColor = ui.goal && ui.goal.by === 'player' ? '#00e5ff' : '#ff2d55'

  return (
    <div className="field-wrap">
      <div
        className="field"
        ref={fieldRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={clearTouch}
        onPointerCancel={clearTouch}
        onPointerLeave={clearTouch}
      >
        <div className="field-center" aria-hidden="true" />

        <div className="field-score" aria-hidden={ui.phase === 'menu'}>
          <span className="score score--player">{ui.playerScore}</span>
          <span className="score score--ai">{ui.aiScore}</span>
        </div>

        {field.bonuses.map((b) => (
          <div
            key={b.id}
            className={`bonus${b.blink ? ' bonus--blink' : ''}`}
            style={{
              left: pct(b.x, FIELD_W),
              top: pct(b.y, FIELD_H),
              '--bonus-color': b.color,
            }}
          />
        ))}

        <div
          className={`paddle paddle--player${field.player.hit ? ' paddle--hit' : ''}`}
          style={{
            left: pct(field.player.cx, FIELD_W),
            top: pct(field.player.cy, FIELD_H),
            height: `calc(var(--scale) * ${field.player.h}px)`,
            width: `calc(var(--scale) * ${PADDLE_W}px)`,
          }}
        />
        <div
          className={`paddle paddle--ai${field.ai.hit ? ' paddle--hit' : ''}`}
          style={{
            left: pct(field.ai.cx, FIELD_W),
            top: pct(field.ai.cy, FIELD_H),
            height: `calc(var(--scale) * ${field.ai.h}px)`,
            width: `calc(var(--scale) * ${PADDLE_W}px)`,
          }}
        />

        {field.trail.map((t, i) => (
          <div
            key={`t-${i}`}
            className="trail"
            style={{
              left: pct(t.x, FIELD_W),
              top: pct(t.y, FIELD_H),
              opacity: 0.05 + (i / Math.max(1, field.trail.length)) * 0.3,
            }}
          />
        ))}

        {field.balls.map((b, i) => (
          <div
            key={i}
            className={`ball${i === 0 ? ' ball--main' : ''}`}
            style={{
              left: pct(b.cx, FIELD_W),
              top: pct(b.cy, FIELD_H),
              width: `calc(var(--scale) * ${BALL_R * 2}px)`,
              height: `calc(var(--scale) * ${BALL_R * 2}px)`,
            }}
          />
        ))}

        {ui.phase === 'goal' && ui.goal && (
          <>
            <div className="goal-flash" style={{ '--flash-color': goalColor }} key={`f-${ui.goal.key}`} />
            <div
              className="goal-banner"
              style={{ color: goalColor, '--flash-color': goalColor }}
              key={`b-${ui.goal.key}`}
            >
              {goalText}
            </div>
          </>
        )}

        {ui.phase === 'serving' && <div className="ready-banner">READY</div>}

        {ui.combo >= 2 && (
          <div className="combo-chip" key={ui.combo}>
            COMBO ×{ui.combo}
          </div>
        )}
      </div>

      {children}
    </div>
  )
}
