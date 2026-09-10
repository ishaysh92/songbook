import { useSpotify } from '../context/SpotifyContext'

export function PlayerBar() {
  const {
    connected,
    playback,
    devices,
    deviceId,
    setDeviceId,
    togglePlayback,
    busy,
    message,
  } = useSpotify()

  if (!connected && !message) return null

  return (
    <div className="player-bar">
      <div className="player-main">
        <button
          type="button"
          className="play-button"
          onClick={() => void togglePlayback()}
          disabled={!connected || busy}
        >
          {playback?.isPlaying ? 'השהה' : 'המשך'}
        </button>
        <div>
          <strong>{playback?.trackName || 'ספוטיפיי ברקע'}</strong>
          <p>
            {playback?.artistName ||
              (connected
                ? 'האתר שולט בספוטיפיי. האפליקציה נשארת ברקע.'
                : 'התחברו כדי להשמיע.')}
          </p>
        </div>
      </div>
      {devices.length > 0 && (
        <label className="device-picker">
          מכשיר
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
                {device.is_active ? ' • פעיל' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {message && <p className="player-message">{message}</p>}
    </div>
  )
}
