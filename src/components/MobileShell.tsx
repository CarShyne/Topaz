import { useEffect, useState } from 'react'
import { Menu, X, Plus, PanelRightOpen, Settings, Network } from 'lucide-react'
import { useGemStore } from '../stores/gemStore'
import { deviceKind } from '../lib/device'
import icon from '../assets/icon.png'
import { FileExplorer } from './FileExplorer'
import { Workspace } from './Workspace'
import { NoteInfoPanel } from './NoteInfoPanel'
import styles from './MobileShell.module.css'

export function MobileShell() {
  const [browseOpen, setBrowseOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [kind, setKind] = useState(deviceKind())
  const gemName = useGemStore(s => s.gemName)
  const setCreateNoteOpen = useGemStore(s => s.setCreateNoteOpen)
  const setSettingsOpen = useGemStore(s => s.setSettingsOpen)
  const openTab = useGemStore(s => s.openTab)
  const tabs = useGemStore(s => s.tabs)
  const activeTabId = useGemStore(s => s.activeTabId)
  const activeTab = tabs.find(t => t.id === activeTabId)

  useEffect(() => {
    const onResize = () => setKind(deviceKind())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isTablet = kind === 'tablet'

  return (
    <div className={`${styles.shell} ${isTablet ? styles.tablet : styles.phone}`}>
      <header className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => setBrowseOpen(true)} aria-label="Browse notes">
          <Menu size={22} strokeWidth={1.75} />
        </button>
        <div className={styles.titleBlock}>
          <span className={styles.brand}>Topaz</span>
          <span className={styles.gem}>{activeTab?.title ?? gemName}</span>
        </div>
        <button className={styles.iconBtn} onClick={() => setInfoOpen(v => !v)} aria-label="Note info">
          <PanelRightOpen size={20} strokeWidth={1.75} />
        </button>
        <button className={styles.fab} onClick={() => setCreateNoteOpen(true)} aria-label="New note">
          <Plus size={20} />
        </button>
      </header>

      <div className={styles.body}>
        {isTablet && (
          <aside className={`${styles.tabletSide} ${styles.sidePane}`}>
            <div className={styles.paneHead}>Projects</div>
            <FileExplorer />
          </aside>
        )}
        <main className={styles.mainPane}>
          <Workspace />
        </main>
        {infoOpen && (
          <aside className={`${styles.infoDrawer} ${styles.sidePane}`}>
            <NoteInfoPanel compact onClose={() => setInfoOpen(false)} />
          </aside>
        )}
      </div>

      {browseOpen && (
        <div className={styles.overlay} onClick={() => setBrowseOpen(false)}>
          <aside className={`${styles.drawer} ${styles.sidePane}`} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHead}>
              <img src={icon} alt="" className={styles.logo} />
              <div>
                <span className={styles.brand}>Topaz</span>
                {gemName && <span className={styles.gem}>{gemName}</span>}
              </div>
              <button className={styles.iconBtn} onClick={() => setBrowseOpen(false)} aria-label="Close">
                <X size={22} />
              </button>
            </div>
            <div className={styles.paneHead}>Projects</div>
            <FileExplorer />
            <div className={styles.drawerActions}>
              <button className={styles.drawerBtn} onClick={() => { openTab('__graph__', 'Graph', 'graph'); setBrowseOpen(false) }}>
                <Network size={18} /> Graph
              </button>
              <button className={styles.drawerBtn} onClick={() => { setSettingsOpen(true); setBrowseOpen(false) }}>
                <Settings size={18} /> Settings
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
