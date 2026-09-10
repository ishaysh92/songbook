import { useEffect, useRef, useState } from 'react'
import { useSongs } from '../context/SongsContext'
import { useSpotify } from '../context/SpotifyContext'

export function SettingsPage() {
  const { exportSongs, importSongs } = useSongs()
  const {
    clientId,
    saveClientId,
    redirectUri,
    connected,
    login,
    logout,
    devices,
    refreshDevices,
  } = useSpotify()
  const [draftId, setDraftId] = useState(clientId)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftId(clientId)
  }, [clientId])

  return (
    <section className="page">
      <p className="eyebrow">הגדרות</p>
      <h1>ספוטיפיי והספר</h1>

      <div className="settings-card">
        <h2>חיבור ספוטיפיי</h2>
        <p>
          צרו אפליקציה ב־
          <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
            Spotify Developer Dashboard
          </a>
          , והדביקו כאן את ה-Client ID. בכתובת ה-Redirect הוסיפו בדיוק את הכתובת הבאה:
        </p>
        <code className="copy-box">{redirectUri || 'טוען…'}</code>
        <label>
          Spotify Client ID
          <input
            value={draftId}
            onChange={(event) => setDraftId(event.target.value)}
            placeholder="הדביקו את המזהה מהדשבורד"
          />
        </label>
        <div className="row-actions">
          <button
            type="button"
            className="play-button"
            onClick={() => {
              saveClientId(draftId)
              setStatus('מזהה האפליקציה נשמר במכשיר הזה.')
            }}
          >
            שמירת מזהה
          </button>
          {connected ? (
            <button type="button" className="ghost-button" onClick={logout}>
              התנתקות
            </button>
          ) : (
            <button
              type="button"
              className="ghost-button"
              onClick={() => void login(draftId)}
            >
              התחברות לספוטיפיי
            </button>
          )}
          <button type="button" className="text-button" onClick={() => void refreshDevices()}>
            רענון מכשירים
          </button>
        </div>
        {devices.length > 0 && (
          <p className="muted">
            מכשירים זמינים: {devices.map((device) => device.name).join(', ')}
          </p>
        )}
      </div>

      <div className="settings-card">
        <h2>גיבוי השירים</h2>
        <p>
          שירים חדשים נשמרים בינתיים במכשיר הזה. כדי לשתף אותם באתר הציבורי, ייצאו את הקובץ והחליפו
          את <code>public/songs.json</code> בגיטהאב.
        </p>
        <div className="row-actions">
          <button type="button" className="play-button" onClick={exportSongs}>
            ייצוא JSON
          </button>
          <button type="button" className="ghost-button" onClick={() => fileRef.current?.click()}>
            ייבוא JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void importSongs(file)
                .then((count) => setStatus(`יובאו ${count} שירים.`))
                .catch(() => setStatus('הייבוא נכשל. בדקו שהקובץ הוא JSON תקין.'))
              event.target.value = ''
            }}
          />
        </div>
      </div>
      {status && <p className="player-message">{status}</p>}
    </section>
  )
}
