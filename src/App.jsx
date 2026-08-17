import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Pong from './components/Pong.jsx'

const BG_SHAPES = [
  { left: '5%', color: '#00e5ff', delay: '0s', size: 44 },
  { left: '15%', color: '#c93dff', delay: '5s', size: 30 },
  { left: '27%', color: '#00e676', delay: '9s', size: 52 },
  { left: '41%', color: '#ffd600', delay: '2s', size: 26 },
  { left: '55%', color: '#ff9100', delay: '7s', size: 38 },
  { left: '69%', color: '#ff2d55', delay: '11s', size: 32 },
  { left: '83%', color: '#3d7bff', delay: '4s', size: 48 },
]

function BgShapes() {
  return (
    <div className="bg-shapes" aria-hidden="true">
      {BG_SHAPES.map((s, i) => (
        <span
          key={i}
          style={{
            left: s.left,
            width: s.size,
            height: s.size,
            background: s.color,
            animationDelay: s.delay,
            animationDuration: `${14 + (i % 4) * 3}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <BgShapes />
      <Header />
      <main className="app-main">
        <Pong />
      </main>
      <Footer />
    </div>
  )
}
