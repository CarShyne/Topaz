import { EditorView, Decoration, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { URL_PATTERN, trimTrailingUrlPunctuation, findUrlAt, openExternalLink } from './links'

const linkMark = Decoration.mark({ class: 'cm-note-link' })

function addUrlMarks(text: string, offset: number, builder: RangeSetBuilder<Decoration>) {
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const cleaned = trimTrailingUrlPunctuation(match[0])
    const start = offset + match.index
    builder.add(start, start + cleaned.length, linkMark)
  }
}

function buildLinkDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    addUrlMarks(view.state.doc.sliceString(from, to), from, builder)
  }
  return builder.finish()
}

const linkHighlightPlugin = ViewPlugin.fromClass(class {
  decorations

  constructor(view: EditorView) {
    this.decorations = buildLinkDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = buildLinkDecorations(update.view)
    }
  }
}, { decorations: plugin => plugin.decorations })

export function noteLinkExtension() {
  return [
    linkHighlightPlugin,
    EditorView.domEventHandlers({
      mousedown(e, view) {
        if (e.button !== 0) return false
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
        if (pos == null) return false
        const url = findUrlAt(view.state.doc.toString(), pos)
        if (!url) return false
        e.preventDefault()
        openExternalLink(url)
        return true
      },
      touchstart(e, view) {
        const touch = e.touches[0]
        if (!touch) return false
        const pos = view.posAtCoords({ x: touch.clientX, y: touch.clientY })
        if (pos == null) return false
        const url = findUrlAt(view.state.doc.toString(), pos)
        if (!url) return false
        openExternalLink(url)
        return true
      },
    }),
  ]
}
