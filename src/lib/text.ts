export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitPeople(value: string): string[] {
  return value
    .split(/[,،;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function joinPeople(value: string[]): string {
  return value.join(', ')
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function createId(): string {
  return crypto.randomUUID()
}
