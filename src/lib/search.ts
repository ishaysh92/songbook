import type { MatchField, SearchHit, Song } from '../types'
import { normalizeText } from './text'

const FIELD_LABELS: Record<MatchField, string> = {
  title: 'שם השיר',
  artist: 'אומן',
  writers: 'כותב',
  composers: 'מלחין',
  lyrics: 'מילים',
}

export function fieldLabel(field: MatchField): string {
  return FIELD_LABELS[field]
}

function snippetAround(text: string, query: string): string | undefined {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return undefined

  const lines = text.split(/\n+/)
  for (const line of lines) {
    if (normalizeText(line).includes(normalizedQuery)) {
      return line.trim()
    }
  }

  const normalizedText = normalizeText(text)
  const index = normalizedText.indexOf(normalizedQuery)
  if (index < 0) return undefined
  const start = Math.max(0, index - 24)
  const end = Math.min(normalizedText.length, index + normalizedQuery.length + 24)
  return `${start > 0 ? '…' : ''}${normalizedText.slice(start, end)}${end < normalizedText.length ? '…' : ''}`
}

export function searchSongs(songs: Song[], query: string): SearchHit[] {
  const needle = normalizeText(query)
  if (!needle) {
    return songs.map((song) => ({ song, fields: [] }))
  }

  const hits: SearchHit[] = []

  for (const song of songs) {
    const fields: MatchField[] = []
    if (normalizeText(song.title).includes(needle)) fields.push('title')
    if (normalizeText(song.artist).includes(needle)) fields.push('artist')
    if (normalizeText(song.writers.join(' ')).includes(needle)) fields.push('writers')
    if (normalizeText(song.composers.join(' ')).includes(needle)) fields.push('composers')

    let lyricSnippet: string | undefined
    if (normalizeText(song.lyrics).includes(needle)) {
      fields.push('lyrics')
      lyricSnippet = snippetAround(song.lyrics, query)
    }

    if (fields.length > 0) {
      hits.push({ song, fields, lyricSnippet })
    }
  }

  return hits
}
