import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { useGemStore } from '../stores/gemStore'
import styles from './SearchPanel.module.css'

interface Result { path: string; snippet: string }

export function SearchPanel() {
  const query = useGemStore(s => s.searchQuery)
  const setQuery = useGemStore(s => s.setSearchQuery)
  const entries = useGemStore(s => s.entries)
  const openTab = useGemStore(s => s.openTab)
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    const files = entries.filter(e => !e.isDir)
    Promise.all(files.map(async f => {
      const content = await window.topaz.readNote(f.path)
      if (!content) return null
      const lower = content.toLowerCase()
      if (!lower.includes(q) && !f.path.toLowerCase().includes(q)) return null
      const idx = lower.indexOf(q)
      const snippet = idx >= 0
        ? content.slice(Math.max(0, idx - 30), idx + 50)
        : f.path
      return { path: f.path, snippet }
    })).then(r => setResults(r.filter(Boolean) as Result[]))
  }, [query, entries])

  return (
    <div className={styles.panel}>
      <div className={styles.inputWrap}>
        <Search size={14} />
        <input
          className={styles.input}
          placeholder="Search notes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className={styles.results}>
        {results.map(r => (
          <button key={r.path} className={styles.result} onClick={() => openTab(r.path)}>
            <span className={styles.name}>{r.path.replace(/\.md$/, '')}</span>
            <span className={styles.snippet}>{r.snippet}</span>
          </button>
        ))}
        {query && results.length === 0 && <p className={styles.none}>No results</p>}
      </div>
    </div>
  )
}
