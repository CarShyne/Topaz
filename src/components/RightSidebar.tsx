import { useEffect, useState } from 'react'
import { useVaultStore, getBacklinks, getOutgoingLinks, extractHeadings, extractTags } from '../stores/vaultStore'
import styles from './RightSidebar.module.css'

export function RightSidebar() {
  const panel = useVaultStore(s => s.rightPanel)
  const setPanel = useVaultStore(s => s.setRightPanel)
  const tabs = useVaultStore(s => s.tabs)
  const activeTabId = useVaultStore(s => s.activeTabId)
  const noteContent = useVaultStore(s => s.noteContent)
  const openTab = useVaultStore(s => s.openTab)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const path = activeTab?.path

  const panels = [
    { id: 'backlinks' as const, label: 'Backlinks' },
    { id: 'outline' as const, label: 'Outline' },
    { id: 'tags' as const, label: 'Tags' },
  ]

  const content = path ? noteContent[path] ?? '' : ''
  const backlinks = path ? getBacklinks(noteContent, path) : []
  const outgoing = content ? getOutgoingLinks(content) : []
  const headings = content ? extractHeadings(content) : []
  const tags = content ? extractTags(content) : []

  useEffect(() => {
    if (!path) return
    if (!noteContent[path]) {
      window.topaz.readNote(path).then(c => {
        if (c) useVaultStore.getState().setNoteContent(path, c)
      })
    }
  }, [path, noteContent])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.tabs}>
        {panels.map(p => (
          <button key={p.id} className={panel === p.id ? styles.active : ''} onClick={() => setPanel(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {!path && <p className={styles.empty}>Open a note to see linked references</p>}
        {path && panel === 'backlinks' && (
          <>
            <Section title="Backlinks">
              {backlinks.length === 0 && <p className={styles.none}>No backlinks</p>}
              {backlinks.map(b => (
                <button key={b.path} className={styles.link} onClick={() => openTab(b.path)}>
                  <span className={styles.linkTitle}>{b.path.replace(/\.md$/, '')}</span>
                  <span className={styles.linkCtx}>{b.context}</span>
                </button>
              ))}
            </Section>
            <Section title="Outgoing links">
              {outgoing.length === 0 && <p className={styles.none}>No outgoing links</p>}
              {outgoing.map(l => (
                <button key={l} className={styles.link} onClick={() => openTab(`${l}.md`, l)}>
                  {l}
                </button>
              ))}
            </Section>
          </>
        )}
        {path && panel === 'outline' && (
          <>
            {headings.length === 0 && <p className={styles.none}>No headings</p>}
            {headings.map((h, i) => (
              <div key={i} className={styles.heading} style={{ paddingLeft: (h.level - 1) * 12 }}>
                {h.text}
              </div>
            ))}
          </>
        )}
        {path && panel === 'tags' && (
          <>
            {tags.length === 0 && <p className={styles.none}>No tags</p>}
            <div className={styles.tagList}>
              {tags.map(t => <span key={t} className={styles.tag}>#{t}</span>)}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}
