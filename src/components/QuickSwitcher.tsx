import { useEffect, useState } from 'react'
import { useVaultStore } from '../stores/vaultStore'
import styles from './QuickSwitcher.module.css'

export function QuickSwitcher() {
  const open = useVaultStore(s => s.quickSwitcherOpen)
  const setOpen = useVaultStore(s => s.setQuickSwitcherOpen)
  const entries = useVaultStore(s => s.entries)
  const openTab = useVaultStore(s => s.openTab)
  const [query, setQuery] = useState('')

  const files = entries.filter(e => !e.isDir)
  const filtered = query
    ? files.filter(f => f.path.toLowerCase().includes(query.toLowerCase()))
    : files

  useEffect(() => { if (!open) setQuery('') }, [open])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.switcher} onClick={e => e.stopPropagation()}>
        <input
          className={styles.input}
          placeholder="Find note…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className={styles.list}>
          {filtered.map(f => (
            <button key={f.path} className={styles.item} onClick={() => { openTab(f.path); setOpen(false) }}>
              {f.path.replace(/\.md$/, '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
