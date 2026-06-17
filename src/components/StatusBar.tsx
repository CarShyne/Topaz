import { useVaultStore } from '../stores/vaultStore'
import { isCapacitor } from '../lib/device'
import styles from './StatusBar.module.css'

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

export function StatusBar() {
  const tabs = useVaultStore(s => s.tabs)
  const activeTabId = useVaultStore(s => s.activeTabId)
  const noteContent = useVaultStore(s => s.noteContent)
  const editorMode = useVaultStore(s => s.editorMode)
  const editorStats = useVaultStore(s => s.editorStats)
  const path = tabs.find(t => t.id === activeTabId)?.path
  const fallbackContent = path ? noteContent[path] ?? '' : ''
  const words = editorStats?.words ?? countWords(fallbackContent)
  const chars = editorStats?.chars ?? fallbackContent.length

  if (isCapacitor) {
    return (
      <footer className={`${styles.bar} ${styles.barMobile}`}>
        {path ? (
          <span className={styles.stats}>{words} words · {chars} chars</span>
        ) : (
          <span className={styles.stats}>No file open</span>
        )}
      </footer>
    )
  }

  return (
    <footer className={styles.bar}>
      <span>{path ? path : 'No file open'}</span>
      <div className={styles.right}>
        {path && <span>{words} words · {chars} chars</span>}
        <span>{editorMode}</span>
      </div>
    </footer>
  )
}
