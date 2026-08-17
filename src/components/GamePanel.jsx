import { memo } from 'react'

const MODE_LABEL = { classic: 'Classic', blitz: 'Blitz', survival: 'Survival' }

function recordFor(ui, best) {
  if (ui.mode === 'classic')
    return best.classic == null ? '—' : `${best.classic} missed`
  if (ui.mode === 'blitz') return best.blitz == null ? '—' : String(best.blitz)
  if (ui.mode === 'survival') return best.survival == null ? '—' : `${best.survival}s`
  return '—'
}

function GamePanel({ ui, best, soundOn, onTogglePause, onRestart, onToggleSound }) {
  const active =
    ui.phase === 'serving' || ui.phase === 'rally' || ui.phase === 'goal' || ui.phase === 'paused'

  return (
    <div className="panels d-flex flex-column gap-3">
      <div className="panel">
        <div className="d-flex justify-content-between align-items-baseline">
          <span className="stat-label">Mode</span>
          <span className="stat-value stat-value--mode">{MODE_LABEL[ui.mode]}</span>
        </div>
        <div className="d-flex justify-content-between align-items-baseline">
          <span className="stat-label">Score</span>
          <span className="stat-value">
            <span className="score score--player">{ui.playerScore}</span>
            <span className="score-sep">:</span>
            <span className="score score--ai">{ui.aiScore}</span>
          </span>
        </div>
        {(ui.mode === 'blitz' || ui.mode === 'survival') && (
          <div className="d-flex justify-content-between align-items-baseline">
            <span className="stat-label">Time</span>
            <span className="stat-value stat-value--accent">
              {ui.mode === 'blitz' ? `${ui.blitzLeft}s` : `${ui.survivalTime}s`}
            </span>
          </div>
        )}
        <div className="d-flex justify-content-between align-items-baseline">
          <span className="stat-label">Ball speed</span>
          <span key={ui.speedNorm} className="stat-value stat-value--pop">
            {ui.speedNorm.toFixed(1)}×
          </span>
        </div>
        <div className="d-flex justify-content-between align-items-baseline">
          <span className="stat-label">Combo</span>
          <span className="stat-value">{ui.combo > 0 ? `×${ui.combo}` : '—'}</span>
        </div>
        <div className="d-flex justify-content-between align-items-baseline">
          <span className="stat-label">Record</span>
          <span className="stat-value stat-value--accent">{recordFor(ui, best)}</span>
        </div>
      </div>

      <div className="panel">
        <div className="d-grid gap-2">
          <button type="button" className="btn btn-accent" onClick={onTogglePause} disabled={!active}>
            {ui.phase === 'paused' ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="btn btn-outline-light" onClick={onRestart} disabled={!active}>
            Restart
          </button>
        </div>
        <ul className="controls-hint list-unstyled mb-0 mt-3">
          <li>
            <kbd>W</kbd> / <kbd>↑</kbd> up
          </li>
          <li>
            <kbd>S</kbd> / <kbd>↓</kbd> down
          </li>
          <li>
            <kbd>Space</kbd> pause
          </li>
          <li>
            <kbd>R</kbd> restart
          </li>
        </ul>
        <button
          type="button"
          className="btn btn-outline-light btn-sound mt-3"
          onClick={onToggleSound}
          aria-label={soundOn ? 'Mute' : 'Unmute'}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  )
}

export default memo(GamePanel)
