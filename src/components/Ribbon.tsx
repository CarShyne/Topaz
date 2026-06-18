import {
  Files, Search, Bookmark, Network, Plus, Settings,
  PanelLeftClose, PanelRightClose, Command, Zap
} from 'lucide-react'
import { useGemStore } from '../stores/gemStore'
import styles from './Ribbon.module.css'

export function Ribbon() {
  const setLeftPanel = useGemStore(s => s.setLeftPanel)
  const leftPanel = useGemStore(s => s.leftPanel)
  const toggleLeft = useGemStore(s => s.toggleLeftSidebar)
  const toggleRight = useGemStore(s => s.toggleRightSidebar)
  const openTab = useGemStore(s => s.openTab)
  const setCommandPaletteOpen = useGemStore(s => s.setCommandPaletteOpen)
  const setQuickSwitcherOpen = useGemStore(s => s.setQuickSwitcherOpen)
  const setSettingsOpen = useGemStore(s => s.setSettingsOpen)

  const items = [
    { id: 'files' as const, icon: Files, label: 'Files', action: () => setLeftPanel('files') },
    { id: 'search' as const, icon: Search, label: 'Search', action: () => setLeftPanel('search') },
    { id: 'bookmarks' as const, icon: Bookmark, label: 'Bookmarks', action: () => setLeftPanel('bookmarks') },
    { id: 'graph', icon: Network, label: 'Graph', action: () => openTab('__graph__', 'Graph', 'graph') },
    { id: 'new', icon: Plus, label: 'New note', action: () => useGemStore.getState().setCreateNoteOpen(true) },
    { id: 'switcher', icon: Zap, label: 'Quick switcher', action: () => setQuickSwitcherOpen(true) },
    { id: 'palette', icon: Command, label: 'Command palette', action: () => setCommandPaletteOpen(true) },
  ]

  return (
    <nav className={styles.ribbon}>
      {items.map(item => {
        const Icon = item.icon
        const active = 'id' in item && item.id === leftPanel
        return (
          <button
            key={item.label}
            className={`${styles.btn} ${active ? styles.active : ''}`}
            onClick={item.action}
            title={item.label}
          >
            <Icon size={18} strokeWidth={1.75} />
          </button>
        )
      })}
      <div className={styles.spacer} />
      <button className={styles.btn} onClick={toggleLeft} title="Toggle left sidebar">
        <PanelLeftClose size={18} strokeWidth={1.75} />
      </button>
      <button className={styles.btn} onClick={toggleRight} title="Toggle right sidebar">
        <PanelRightClose size={18} strokeWidth={1.75} />
      </button>
      <button className={styles.btn} onClick={() => setSettingsOpen(true)} title="Settings">
        <Settings size={18} strokeWidth={1.75} />
      </button>
    </nav>
  )
}
