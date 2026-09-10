export function parseSpotifyTrack(input: string): {
  id: string
  uri: string
  url: string
} | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const uriMatch = trimmed.match(/spotify:track:([a-zA-Z0-9]+)/i)
  if (uriMatch) {
    const id = uriMatch[1]
    return {
      id,
      uri: `spotify:track:${id}`,
      url: `https://open.spotify.com/track/${id}`,
    }
  }

  const urlMatch = trimmed.match(
    /open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/i,
  )
  if (urlMatch) {
    const id = urlMatch[1]
    return {
      id,
      uri: `spotify:track:${id}`,
      url: `https://open.spotify.com/track/${id}`,
    }
  }

  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return {
      id: trimmed,
      uri: `spotify:track:${trimmed}`,
      url: `https://open.spotify.com/track/${trimmed}`,
    }
  }

  return null
}

export function toSpotifyUri(input: string): string | null {
  return parseSpotifyTrack(input)?.uri ?? null
}
