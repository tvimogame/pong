import { useState } from 'react'
import { usePong } from '../hooks/usePong.js'
import GameField from './GameField.jsx'
import GamePanel from './GamePanel.jsx'

const MODES = [
  { id: 'classic', label: 'CLASSIC' },
  { id: 'blitz', label: 'BLITZ' },
  { id: 'survival', label: 'SURVIVAL' },
]
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'hard', label: 'Hard' },
]

function Pong() {
  const {
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
  } = usePong()

  const [selMode, setSelMode] = useState('classic')
  const [selDiff, setSelDiff] = useState('normal')
  const [selBonuses, setSelBonuses] = useState(true)

  const showDifficulty = selMode === 'classic' || selMode === 'survival'

  const stats = (
    <div className="result-stats">
      {ui.mode !== 'survival' && (
        <div>
          <span className="stat-label">Счёт</span>
          <span className="stat-value">
            {ui.playerScore} : {ui.aiScore}
          </span>
        </div>
      )}
      {ui.mode === 'survival' && (
        <div>
          <span className="stat-label">Время выживания</span>
          <span className="stat-value stat-value--accent">{ui.survivalTime}s</span>
        </div>
      )}
      <div>
        <span className="stat-label">Макс. комбо</span>
        <span className="stat-value">×{ui.maxCombo}</span>
      </div>
      <div>
        <span className="stat-label">Макс. скорость</span>
        <span className="stat-value">{Math.round(ui.maxSpeedReached)} px/s</span>
      </div>
    </div>
  )

  return (
    <div className="game-layout">
      <GameField
        field={field}
        ui={ui}
        movePlayerTo={movePlayerTo}
        clearTouch={clearTouch}
      >
        {ui.phase === 'menu' && (
          <div className="overlay overlay--menu">
            <h1 className="overlay-title">PONG</h1>
            <div className="opt-group">
              <span className="opt-label">Режим</span>
              <div className="opt-row">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`opt${selMode === m.id ? ' opt--active' : ''}`}
                    onClick={() => setSelMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {showDifficulty && (
              <div className="opt-group">
                <span className="opt-label">Сложность AI</span>
                <div className="opt-row">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`opt opt--sm${selDiff === d.id ? ' opt--active' : ''}`}
                      onClick={() => setSelDiff(d.id)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="opt-group">
              <span className="opt-label">Бонусы</span>
              <div className="opt-row">
                <button
                  type="button"
                  className={`opt opt--sm${selBonuses ? ' opt--active' : ''}`}
                  onClick={() => setSelBonuses(true)}
                >
                  ВКЛ
                </button>
                <button
                  type="button"
                  className={`opt opt--sm${!selBonuses ? ' opt--active' : ''}`}
                  onClick={() => setSelBonuses(false)}
                >
                  ВЫКЛ
                </button>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-accent btn-lg px-5"
              onClick={() => start({ mode: selMode, difficulty: selDiff, bonuses: selBonuses })}
            >
              ИГРАТЬ
            </button>
          </div>
        )}

        {ui.phase === 'paused' && (
          <div className="overlay">
            <h1 className="overlay-title">ПАУЗА</h1>
            <button type="button" className="btn btn-accent" onClick={togglePause}>
              Продолжить
            </button>
          </div>
        )}

        {ui.phase === 'over' && (
          <div className="overlay">
            {ui.result === 'win' && <h1 className="overlay-title overlay-title--win">ПОБЕДА</h1>}
            {ui.result === 'lose' && <h1 className="overlay-title overlay-title--lose">ПОРАЖЕНИЕ</h1>}
            {ui.result === 'draw' && <h1 className="overlay-title overlay-title--draw">НИЧЬЯ</h1>}
            {stats}
            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button type="button" className="btn btn-accent" onClick={restart}>
                ЗАНОВО
              </button>
              <button type="button" className="btn btn-outline-light" onClick={goMenu}>
                СМЕНИТЬ РЕЖИМ
              </button>
            </div>
            {ui.mode === 'survival' && best.survival != null && (
              <p className="small text-secondary mb-0">Рекорд: {best.survival}s</p>
            )}
          </div>
        )}
      </GameField>

      <GamePanel
        ui={ui}
        best={best}
        soundOn={soundOn}
        onTogglePause={togglePause}
        onRestart={restart}
        onToggleSound={toggleSound}
      />
    </div>
  )
}

export default Pong
