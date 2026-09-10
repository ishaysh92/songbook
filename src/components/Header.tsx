import { NavLink } from 'react-router-dom'
import { useSongs } from '../context/SongsContext'
import { useSpotify } from '../context/SpotifyContext'

export function Header() {
  const { connected, login, clientId } = useSpotify()
  const { githubConnected, saving } = useSongs()

  return (
    <header className="site-header">
      <div className="brand">
        <NavLink to="/" className="brand-link">
          <span className="brand-mark" aria-hidden="true">
            ♪
          </span>
          <span>
            <strong>ספר השירים</strong>
            <small>מילים, חיפוש והשמעה ברקע</small>
          </span>
        </NavLink>
      </div>
      <nav className="nav">
        <NavLink to="/" end>
          הספר
        </NavLink>
        <NavLink to="/add">שיר חדש</NavLink>
        <NavLink to="/settings">הגדרות</NavLink>
        {githubConnected && (
          <span className="spotify-pill">{saving ? 'שומר ל-GitHub…' : 'נשמר ב-GitHub'}</span>
        )}
        {connected ? (
          <span className="spotify-pill">מחובר לספוטיפיי</span>
        ) : (
          <button type="button" className="text-button" onClick={() => void login()} disabled={!clientId}>
            התחברות לספוטיפיי
          </button>
        )}
      </nav>
    </header>
  )
}
