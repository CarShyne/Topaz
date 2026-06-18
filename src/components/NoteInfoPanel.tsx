import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useGemStore, getBacklinks, getOutgoingLinks, extractHeadings, extractTags } from '../stores/gemStore'
import styles from './NoteInfoPanel.module.css'

interface Props {
  compact?: boolean
  onClose?: () => void
}

export function NoteInfoPanel({ compact, onClose }: Props) {
  const tabs = useGemStore(s => s.tabs)
  const activeTabId = useGemStore(s => s.activeTabId)
  const noteContent = useGemStore(s => s.noteContent)
  const openTab = useGemStore(s => s.openTab)
  const activeTab = tabs.find(t => t.id === activeTabId)
  const path = activeTab?.view === 'note' ? activeTab.path : undefined

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    backlinks: true,
    outgoing: false,
    outline: false,
    tags: false,
  })

  const content = path ? noteContent[path] ?? '' : ''
  const backlinks = path ? getBacklinks(noteContent, path) : []
  const outgoing = content ? getOutgoingLinks(content) : []
  const headings = content ? extractHeadings(content) : []
  const tags = content ? extractTags(content) : []

  useEffect(() => {
    if (!path) return
    if (!noteContent[path]) {
      window.topaz.readNote(path).then(c => {
        if (c) useGemStore.getState().setNoteContent(path, c)
      })
    }
  }, [path, noteContent])

  const toggle = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }))

  if (!path) {
    return (
      <aside className={`${styles.panel} ${compact ? styles.compact : ''}`}>
        <p className={styles.empty}>Open a note to see its details</p>
      </aside>
    )
  }

  const fileName = path.replace(/\.md$/, '').split('/').pop() ?? path

  return (
    <aside className={`${styles.panel} ${compact ? styles.compact : ''}`}>
      <div className={styles.fileHead}>
        <div>
          <span className={styles.fileLabel}>Current note</span>
          <h3 className={styles.fileName}>{fileName}</h3>
          <span className={styles.filePath}>{path}</span>
        </div>
        {onClose && <button className={styles.closeBtn} onClick={onClose}>✕</button>}
      </div>

      <div className={styles.sections}>
        <Section title="Backlinks" count={backlinks.length} open={openSections.backlinks} onToggle={() => toggle('backlinks')}>
          {backlinks.length === 0 && <p className={styles.none}>No backlinks</p>}
          {backlinks.map(b => (
            <button key={b.path} className={styles.link} onClick={() => openTab(b.path)}>
              <span>{b.path.replace(/\.md$/, '')}</span>
            </button>
          ))}
        </Section>

        <Section title="Outgoing links" count={outgoing.length} open={openSections.outgoing} onToggle={() => toggle('outgoing')}>
          {outgoing.length === 0 && <p className={styles.none}>No outgoing links</p>}
          {outgoing.map(l => (
            <button key={l} className={styles.link} onClick={() => openTab(`${l}.md`, l)}>{l}</button>
          ))}
        </Section>

        <Section title="Outline" count={headings.length} open={openSections.outline} onToggle={() => toggle('outline')}>
          {headings.length === 0 && <p className={styles.none}>No headings</p>}
          {headings.map((h, i) => (
            <div key={i} className={styles.heading} style={{ paddingLeft: (h.level - 1) * 10 }}>{h.text}</div>
          ))}
        </Section>

        <Section title="Tags" count={tags.length} open={openSections.tags} onToggle={() => toggle('tags')}>
          {tags.length === 0 && <p className={styles.none}>No tags</p>}
          <div className={styles.tagList}>
            {tags.map(t => <span key={t} className={styles.tag}>#{t}</span>)}
          </div>
        </Section>
      </div>
    </aside>
  )
}

function Section({ title, count, open, onToggle, children }: {
  title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div className={styles.section}>
      <button className={styles.sectionHead} onClick={onToggle}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{title}</span>
        <span className={styles.count}>{count}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  )
}
