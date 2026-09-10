import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { PlaybackState, SpotifyDevice } from '../types'
import {
  beginSpotifyLogin,
  describeSpotifyError,
  exchangeSpotifyCode,
  getAccessToken,
  getPlaybackState,
  getPreferredDeviceId,
  getRedirectUri,
  getStoredClientId,
  listDevices,
  logoutSpotify,
  pausePlayback,
  playUri,
  resumePlayback,
  setPreferredDeviceId,
  setStoredClientId,
} from '../lib/spotify'
import { toSpotifyUri } from '../lib/spotifyTrack'

type SpotifyContextValue = {
  clientId: string
  redirectUri: string
  connected: boolean
  devices: SpotifyDevice[]
  deviceId: string
  playback: PlaybackState | null
  message: string
  busy: boolean
  saveClientId: (id: string) => void
  login: (idOverride?: string) => Promise<void>
  logout: () => void
  setDeviceId: (id: string) => void
  refreshDevices: () => Promise<SpotifyDevice[]>
  playTrack: (spotifyUrl: string) => Promise<void>
  togglePlayback: () => Promise<void>
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null)
let handlingCode: string | null = null

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [clientId, setClientId] = useState('')
  const [connected, setConnected] = useState(false)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [deviceId, setDeviceIdState] = useState('')
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [redirectUri, setRedirectUri] = useState('')

  useEffect(() => {
    setClientId(getStoredClientId())
    setDeviceIdState(getPreferredDeviceId())
    setRedirectUri(getRedirectUri())
  }, [])

  const refreshDevices = useCallback(async () => {
    if (!clientId) return []
    const nextDevices = await listDevices(clientId)
    setDevices(nextDevices)
    setDeviceIdState((current) => {
      if (current && nextDevices.some((device) => device.id === current)) return current
      const active = nextDevices.find((device) => device.is_active) ?? nextDevices[0]
      const nextId = active?.id ?? ''
      if (nextId) setPreferredDeviceId(nextId)
      return nextId
    })
    return nextDevices
  }, [clientId])

  const refreshPlayback = useCallback(async () => {
    if (!clientId || !connected) return
    setPlayback(await getPlaybackState(clientId))
  }, [clientId, connected])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    if (!code && !error) return

    const returnTo = sessionStorage.getItem('songbook.spotify.return') || '#/'
    const cleanUrl = `${getRedirectUri()}${returnTo}`

    if (error) {
      window.history.replaceState({}, '', cleanUrl)
      setMessage('ההתחברות לספוטיפיי בוטלה.')
      return
    }

    const id = clientId || getStoredClientId()
    if (!id || !code || handlingCode === code) return
    handlingCode = code
    window.history.replaceState({}, '', cleanUrl)
    exchangeSpotifyCode(code, id)
      .then(async () => {
        setConnected(true)
        setMessage('התחברתם לספוטיפיי. השירים יתנגנו באפליקציה ברקע.')
        await refreshDevices()
      })
      .catch((err: unknown) => {
        handlingCode = null
        setMessage(describeSpotifyError(err))
      })
  }, [clientId, refreshDevices])

  useEffect(() => {
    if (!clientId) return
    getAccessToken(clientId).then((token) => {
      setConnected(Boolean(token))
    })
  }, [clientId])

  useEffect(() => {
    if (!connected || !clientId) return
    void refreshDevices()
    void refreshPlayback()
    const timer = window.setInterval(() => {
      void refreshPlayback()
    }, 4000)
    return () => window.clearInterval(timer)
  }, [clientId, connected, refreshDevices, refreshPlayback])

  const saveClientId = useCallback((id: string) => {
    setStoredClientId(id)
    setClientId(id.trim())
  }, [])

  const login = useCallback(async (idOverride?: string) => {
    const id = (idOverride ?? clientId).trim()
    if (!id) {
      setMessage('יש להזין מזהה אפליקציית ספוטיפיי בהגדרות.')
      return
    }
    saveClientId(id)
    await beginSpotifyLogin(id)
  }, [clientId, saveClientId])

  const logout = useCallback(() => {
    logoutSpotify()
    setConnected(false)
    setPlayback(null)
    setDevices([])
    setMessage('התנתקתם מספוטיפיי.')
  }, [])

  const setDeviceId = useCallback((id: string) => {
    setDeviceIdState(id)
    setPreferredDeviceId(id)
  }, [])

  const playTrack = useCallback(
    async (spotifyUrl: string) => {
      const uri = toSpotifyUri(spotifyUrl)
      if (!uri) {
        setMessage('לשיר הזה אין קישור ספוטיפיי תקין.')
        return
      }
      if (!connected) {
        setMessage('התחברו לספוטיפיי כדי להשמיע ברקע.')
        return
      }
      setBusy(true)
      setMessage('')
      try {
        let activeDevice = deviceId
        const nextDevices = await refreshDevices()
        if (!activeDevice) {
          activeDevice = nextDevices.find((device) => device.is_active)?.id ?? nextDevices[0]?.id ?? ''
        }
        await playUri(clientId, uri, activeDevice || undefined)
        setMessage('השיר מתנגן עכשיו בספוטיפיי ברקע.')
        await refreshPlayback()
      } catch (error) {
        setMessage(describeSpotifyError(error))
      } finally {
        setBusy(false)
      }
    },
    [clientId, connected, deviceId, refreshDevices, refreshPlayback],
  )

  const togglePlayback = useCallback(async () => {
    if (!connected) return
    setBusy(true)
    try {
      if (playback?.isPlaying) await pausePlayback(clientId)
      else await resumePlayback(clientId)
      await refreshPlayback()
    } catch (error) {
      setMessage(describeSpotifyError(error))
    } finally {
      setBusy(false)
    }
  }, [clientId, connected, playback?.isPlaying, refreshPlayback])

  const value = useMemo(
    () => ({
      clientId,
      redirectUri,
      connected,
      devices,
      deviceId,
      playback,
      message,
      busy,
      saveClientId,
      login,
      logout,
      setDeviceId,
      refreshDevices,
      playTrack,
      togglePlayback,
    }),
    [
      busy,
      clientId,
      connected,
      deviceId,
      devices,
      login,
      logout,
      message,
      playback,
      playTrack,
      redirectUri,
      refreshDevices,
      saveClientId,
      togglePlayback,
    ],
  )

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>
}

export function useSpotify() {
  const value = useContext(SpotifyContext)
  if (!value) throw new Error('SpotifyProvider is missing')
  return value
}
