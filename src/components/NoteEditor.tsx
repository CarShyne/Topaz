import { useEffect, useRef, useCallback, useState } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, placeholder } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap } from '@codemirror/search'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { useVaultStore } from '../stores/vaultStore'
import { renderMarkdown } from '../lib/markdown'
import { isCapacitor } from '../lib/device'
import { bumpSyncMtime } from '../lib/sync-meta'
import { requestSyncDebounced } from '../lib/sync-trigger'
import { noteLinkExtension } from '../lib/codemirror-links'
import { openExternalLink } from '../lib/links'
import styles from './NoteEditor.module.css'

const topazTheme = EditorView.theme({
  '&': { backgroundColor: '#0a0a0a', color: '#e8e8e8', height: '100%' },
  '.cm-content': { caretColor: '#e0115f', padding: '16px 18px' },
  '.cm-gutters': { display: 'none' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': { backgroundColor: 'rgba(224,17,95,0.2)' },
  '&.cm-focused': { outline: 'none' },
})

export function NoteEditor({ path }: { path: string }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const pathRef = useRef(path)
  const savingRef = useRef(false)
  const loadedPathRef = useRef<string | null>(null)
  const editorMode = useVaultStore(s => s.editorMode)
  const noteContent = useVaultStore(s => s.noteContent)
  const setNoteContent = useVaultStore(s => s.setNoteContent)
  const openTab = useVaultStore(s => s.openTab)
  const entries = useVaultStore(s => s.entries)
  const [loadError, setLoadError] = useState('')
  const [liveContent, setLiveContent] = useState('')
  const mobile = isCapacitor
  const mode = mobile ? 'source' : editorMode
  const externalContent = noteContent[path]

  const knownNotes = new Set(
    Object.keys(noteContent).map(p => p.replace(/\.md$/, ''))
      .concat(entries.filter(e => !e.isDir).map(e => e.path.replace(/\.md$/, '')))
  )

  const saveToDisk = useCallback(async (content: string) => {
    if (pathRef.current !== path) return
    savingRef.current = true
    await window.topaz.writeNote(path, content)
    const vaultPath = useVaultStore.getState().vaultPath
    if (vaultPath) await bumpSyncMtime(vaultPath, path)
    savingRef.current = false
    requestSyncDebounced()
  }, [path])

  useEffect(() => {
    pathRef.current = path
    setLoadError('')
    loadedPathRef.current = null
    window.topaz.readNote(path).then(content => {
      if (pathRef.current !== path) return
      if (content === null) {
        setLoadError('Could not load this note.')
        return
      }
      loadedPathRef.current = path
      setNoteContent(path, content)
      setLiveContent(content)
      const view = viewRef.current
      if (view) {
        const current = view.state.doc.toString()
        if (current !== content) {
          view.dispatch({ changes: { from: 0, to: current.length, insert: content } })
        }
      }
    })
  }, [path, setNoteContent])

  // Push external changes (sync) into editor without recreating it
  useEffect(() => {
    if (externalContent === undefined || savingRef.current) return
    if (loadedPathRef.current !== path) return
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== externalContent) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: externalContent } })
      setLiveContent(externalContent)
    }
  }, [path, externalContent])

  useEffect(() => {
    if (!editorRef.current || mode === 'preview') return

    const initial = noteContent[path] ?? ''
    const extensions = [
      drawSelection(),
      history(),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle),
      topazTheme,
      placeholder(mobile ? 'Tap to edit…' : 'Start writing…'),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      EditorView.lineWrapping,
      ...noteLinkExtension(),
      ...(mobile ? [
        EditorView.contentAttributes.of({
          enterkeyhint: 'done',
          autocapitalize: 'sentences',
          autocorrect: 'on',
        }),
        EditorView.updateListener.of(update => {
          if (!update.focusChanged || !update.view.hasFocus) return
          const head = update.state.selection.main.head
          update.view.dispatch({
            effects: EditorView.scrollIntoView(head, { y: 'center' }),
          })
        }),
      ] : []),
      EditorView.updateListener.of(update => {
        if (!update.docChanged) return
        const content = update.state.doc.toString()
        setLiveContent(content)
        void saveToDisk(content)
      }),
    ]

    if (!mobile) {
      extensions.unshift(lineNumbers(), highlightActiveLine())
    }

    const state = EditorState.create({ doc: initial, extensions })
    const view = new EditorView({ state, parent: editorRef.current })
    viewRef.current = view
    if (!mobile) {
      requestAnimationFrame(() => view.focus())
    }

    return () => {
      view.destroy()
      if (viewRef.current === view) viewRef.current = null
    }
  }, [path, mode, mobile, saveToDisk])

  const html = renderMarkdown(liveContent || externalContent || '', knownNotes)

  const handlePreviewClick = (e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a.note-link, .markdown-preview a')
    if (anchor instanceof HTMLAnchorElement) {
      e.preventDefault()
      const href = anchor.getAttribute('data-href') ?? anchor.getAttribute('href')
      if (href) openExternalLink(href)
      return
    }

    const target = (e.target as HTMLElement).closest('[data-wikilink]')
    if (target) {
      const link = target.getAttribute('data-wikilink')
      if (link) {
        const notePath = entries.find(e => !e.isDir && (e.path.replace(/\.md$/, '') === link || e.name.replace(/\.md$/, '') === link))?.path
        if (notePath) openTab(notePath)
        else openTab(`${link}.md`)
      }
    }
  }

  if (loadError) {
    return <div className={styles.empty}>{loadError}</div>
  }

  if (mode === 'preview') {
    return (
      <div className={`markdown-preview ${styles.preview}`} dangerouslySetInnerHTML={{ __html: html }} onClick={handlePreviewClick} />
    )
  }

  if (mode === 'split' && !mobile) {
    return (
      <div className={styles.split}>
        <div ref={editorRef} className={styles.editorPane} />
        <div className={`markdown-preview ${styles.previewPane}`} dangerouslySetInnerHTML={{ __html: html }} onClick={handlePreviewClick} />
      </div>
    )
  }

  return <div ref={editorRef} className={styles.editor} />
}
