import { useGemStore } from '../stores/gemStore'
import { FileExplorer } from './FileExplorer'
import { SearchPanel } from './SearchPanel'
import styles from './LeftSidebar.module.css'

export function LeftSidebar() {
  const panel = useGemStore(s => s.leftPanel)

  const titles = { files: 'Files', search: 'Search', bookmarks: 'Bookmarks' }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>{titles[panel]}</div>
      <div className={styles.content}>
        {panel === 'files' && <FileExplorer />}
        {panel === 'search' && <SearchPanel />}
        {panel === 'bookmarks' && <p className={styles.empty}>No bookmarks yet. Pin notes from the command palette.</p>}
      </div>
    </aside>
  )
}
