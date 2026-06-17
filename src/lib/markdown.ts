import { URL_PATTERN, trimTrailingUrlPunctuation, normalizeUrl } from './links'

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
const HEADING_RE = /^(#{1,6})\s+(.+)$/
const BOLD_RE = /\*\*(.+?)\*\*/g
const ITALIC_RE = /\*(.+?)\*/g
const CODE_RE = /`([^`]+)`/g
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const TAG_RE = /(^|\s)#([a-zA-Z0-9_/-]+)/g

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function linkHtml(label: string, href: string): string {
  const normalized = normalizeUrl(href)
  const safeHref = escapeHtml(normalized)
  const safeLabel = escapeHtml(label)
  return `<a href="${safeHref}" class="note-link" data-href="${safeHref}">${safeLabel}</a>`
}

function autolinkUrls(text: string): string {
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags)
  return text.split(/(<[^>]+>)/g).map(part => {
    if (part.startsWith('<')) return part
    return part.replace(re, (match) => {
      const cleaned = trimTrailingUrlPunctuation(match)
      return linkHtml(cleaned, cleaned)
    })
  }).join('')
}

function inlineFormat(text: string, knownNotes: Set<string>): string {
  let s = escapeHtml(text)
  s = s.replace(CODE_RE, '<code>$1</code>')
  s = s.replace(BOLD_RE, '<strong>$1</strong>')
  s = s.replace(ITALIC_RE, '<em>$1</em>')
  s = s.replace(LINK_RE, (_, label: string, href: string) => linkHtml(label, href))
  s = autolinkUrls(s)
  s = s.replace(WIKILINK_RE, (_, target: string, alias?: string) => {
    const resolved = knownNotes.has(target)
    const cls = resolved ? 'wikilink' : 'wikilink unresolved'
    return `<span class="${cls}" data-wikilink="${escapeHtml(target)}">${escapeHtml(alias ?? target)}</span>`
  })
  s = s.replace(TAG_RE, '$1<span class="tag">#$2</span>')
  return s
}

export function renderMarkdown(content: string, knownNotes: Set<string>): string {
  const lines = content.split('\n')
  const html: string[] = []
  let inCode = false
  let codeBuf: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' = 'ul'

  const closeList = () => {
    if (inList) { html.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
        codeBuf = []
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }

    const hm = line.match(HEADING_RE)
    if (hm) {
      closeList()
      const lvl = hm[1].length
      html.push(`<h${lvl}>${inlineFormat(hm[2], knownNotes)}</h${lvl}>`)
      continue
    }

    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      closeList()
      html.push('<hr>')
      continue
    }

    if (line.startsWith('> ')) {
      closeList()
      html.push(`<blockquote><p>${inlineFormat(line.slice(2), knownNotes)}</p></blockquote>`)
      continue
    }

    const ulm = line.match(/^[-*+]\s+(.+)/)
    if (ulm) {
      if (!inList || listType !== 'ul') {
        closeList()
        html.push('<ul>')
        inList = true
        listType = 'ul'
      }
      html.push(`<li>${inlineFormat(ulm[1], knownNotes)}</li>`)
      continue
    }

    const olm = line.match(/^\d+\.\s+(.+)/)
    if (olm) {
      if (!inList || listType !== 'ol') {
        closeList()
        html.push('<ol>')
        inList = true
        listType = 'ol'
      }
      html.push(`<li>${inlineFormat(olm[1], knownNotes)}</li>`)
      continue
    }

    if (line.trim() === '') {
      closeList()
      continue
    }

    closeList()
    html.push(`<p>${inlineFormat(line, knownNotes)}</p>`)
  }

  closeList()
  if (inCode && codeBuf.length) {
    html.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
  }
  return html.join('\n')
}
