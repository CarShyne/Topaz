import { useVaultStore } from '../stores/vaultStore'
import styles from './StatusBar.module.css'

export function StatusBar() {
  const tabs = useVaultStore(s => s.tabs)
  const activeTabId = useVaultStore(s => s.activeTabId)
  const noteContent = useVaultStore(s => s.noteContent)
  const editorMode = useVaultStore(s => s.editorMode)
  const path = tabs.find(t => t.id === activeTabId)?.path
  const content = path ? noteContent[path] ?? '' : ''
  const words = content.trim() ? content.trim().split(/\s+/).length : 0
  const chars = content.length

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
