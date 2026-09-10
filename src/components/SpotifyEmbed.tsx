import { parseSpotifyTrack } from '../lib/spotifyTrack'

export function SpotifyEmbed({ url, compact = false }: { url: string; compact?: boolean }) {
  const parsed = parseSpotifyTrack(url)
  if (!parsed) return null

  return (
    <iframe
      title="Spotify"
      src={`https://open.spotify.com/embed/track/${parsed.id}?utm_source=generator`}
      width="100%"
      height={compact ? 80 : 152}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      className="spotify-embed"
    />
  )
}
