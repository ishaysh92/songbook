import { useEffect, useRef, useState } from 'react'
import { useSongs } from '../context/SongsContext'
import { useSpotify } from '../context/SpotifyContext'
import { describeGithubError, inferGithubRepo } from '../lib/github'

export function SettingsPage() {
  const {
    exportSongs,
    importSongs,
    githubConnected,
    connectGithub,
    disconnectGithub,
    reloadSongs,
    saving,
    syncMessage,
  } = useSongs()
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
  const [token, setToken] = useState('')
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const repo = inferGithubRepo()

  useEffect(() => {
    setDraftId(clientId)
  }, [clientId])

  useEffect(() => {
    if (syncMessage) setStatus(syncMessage)
  }, [syncMessage])

  return (
    <section className="page">
      <p className="eyebrow">הגדרות</p>
      <h1>ספוטיפיי והספר</h1>

      <div className="settings-card">
        <h2>שמירה ב-GitHub</h2>
        <p>
          כדי ששיר שתוסיף יופיע בכל מכשיר, צריך אסימון כתיבה לריפו{' '}
          <a href={`https://github.com/${repo.owner}/${repo.repo}`} target="_blank" rel="noreferrer">
            {repo.owner}/{repo.repo}
          </a>
          . בלי אסימון אפשר רק לצפות. צפייה לא דורשת אסימון.
        </p>
        <ol className="settings-steps">
          <li>
            פתחו{' '}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noreferrer"
            >
              יצירת Fine-grained token
            </a>
          </li>
          <li>Repository access: רק את {repo.owner}/{repo.repo}</li>
          <li>Permissions → Repository → Contents: Read and write</li>
          <li>Generate token, העתיקו, והדביקו כאן</li>
        </ol>
        <label>
          GitHub token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="github_pat_..."
          />
        </label>
        <div className="row-actions">
          <button
            type="button"
            className="play-button"
            disabled={saving || !token.trim()}
            onClick={() => {
              void connectGithub(token)
                .then(() => {
                  setToken('')
                  setStatus('GitHub מחובר. מעכשיו שירים נשמרים לכולם.')
                })
                .catch((error: unknown) => setStatus(describeGithubError(error)))
            }}
          >
            {saving ? 'שומר…' : 'חיבור וסנכרון'}
          </button>
          <button type="button" className="ghost-button" onClick={() => void reloadSongs()}>
            טעינה מחדש
          </button>
          {githubConnected && (
            <button type="button" className="text-button" onClick={disconnectGithub}>
              ניתוק ממכשיר זה
            </button>
          )}
        </div>
        <p className="muted">
          {githubConnected
            ? 'המכשיר הזה יכול להוסיף ולערוך שירים לכל העולם.'
            : 'המכשיר הזה עדיין לא יכול לשמור ל-GitHub.'}
        </p>
      </div>

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
        <h2>גיבוי נוסף</h2>
        <p>אפשר גם להוריד או לייבא קובץ JSON ידנית.</p>
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
