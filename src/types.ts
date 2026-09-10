export type MatchField = 'title' | 'artist' | 'writers' | 'composers' | 'lyrics'

export type Song = {
  id: string
  title: string
  artist: string
  writers: string[]
  composers: string[]
  lyrics: string
  spotifyUrl: string
  createdAt: string
  updatedAt: string
  source: 'catalog' | 'local'
}

export type SongDraft = {
  title: string
  artist: string
  writers: string
  composers: string
  lyrics: string
  spotifyUrl: string
}

export type SearchHit = {
  song: Song
  fields: MatchField[]
  lyricSnippet?: string
}

export type SpotifyDevice = {
  id: string
  name: string
  type: string
  is_active: boolean
}

export type PlaybackState = {
  isPlaying: boolean
  trackName?: string
  artistName?: string
  deviceName?: string
}
