export default function Header() {
  return (
    <header className="app-header">
      <nav className="navbar navbar-expand pong-header">
        <div className="container">
          <span className="navbar-brand pong-brand">
            <span className="brand-blocks" aria-hidden="true">
              <i className="b b1" />
              <i className="b b2" />
              <i className="b b3" />
              <i className="b b4" />
            </span>
            tvimogame
          </span>
          <span className="navbar-text pong-nav-text d-none d-sm-inline">Pong</span>
        </div>
      </nav>
    </header>
  )
}
