export default function Footer() {
  return (
    <footer className="pong-footer">
      <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <span>
          © {new Date().getFullYear()} <strong>tvimogame</strong>
        </span>
        <span className="pong-footer-tag">Pong · React + Bootstrap</span>
      </div>
    </footer>
  )
}
