/** Detect bare URLs and markdown links in note content. */
export const URL_PATTERN =
  /\b(https?:\/\/[^\s<]+|www\.[^\s<]+|[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}(?:\/[^\s<]*)?)/g

export function trimTrailingUrlPunctuation(url: string): string {
  let trimmed = url
  while (/[.,;:!?)}\]]$/.test(trimmed)) trimmed = trimmed.slice(0, -1)
  return trimmed
}

export function normalizeUrl(url: string): string {
  const trimmed = trimTrailingUrlPunctuation(url.trim())
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function openExternalLink(url: string): void {
  void window.topaz.openExternal(normalizeUrl(url))
}

export function findUrlAt(text: string, index: number): string | null {
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const raw = match[0]
    const cleaned = trimTrailingUrlPunctuation(raw)
    const start = match.index
    const end = start + cleaned.length
    if (index >= start && index <= end) return cleaned
  }
  return null
}
