import { NavLink } from 'react-router-dom'

export function Header() {
  return (
    <header className="site-header">
      <div className="brand">
        <NavLink to="/" className="brand-link">
          <span className="brand-mark" aria-hidden="true">
            ♪
          </span>
          <span>
            <strong>ספר השירים</strong>
            <small>מוסיפים, מחפשים, ושומעים</small>
          </span>
        </NavLink>
      </div>
      <nav className="nav">
        <NavLink to="/" end>
          הספר
        </NavLink>
        <NavLink to="/add">שיר חדש</NavLink>
      </nav>
    </header>
  )
}
