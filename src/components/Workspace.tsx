import { useGemStore } from '../stores/gemStore'
import { NoteEditor } from './NoteEditor'
import { GraphView } from './GraphView'
import { X, PanelRightOpen } from 'lucide-react'
import { isCapacitor } from '../lib/device'
import styles from './Workspace.module.css'

export function Workspace() {
  const tabs = useGemStore(s => s.tabs)
  const activeTabId = useGemStore(s => s.activeTabId)
  const closeTab = useGemStore(s => s.closeTab)
  const editorMode = useGemStore(s => s.editorMode)
  const setEditorMode = useGemStore(s => s.setEditorMode)
  const rightOpen = useGemStore(s => s.rightSidebarOpen)
  const toggleRight = useGemStore(s => s.toggleRightSidebar)
  const activeTab = tabs.find(t => t.id === activeTabId)

  return (
    <main className={styles.workspace}>
      <div className={styles.tabBar}>
        {activeTab ? (
          <div className={styles.currentFile}>
            <span className={styles.fileName}>{activeTab.title}</span>
            {activeTab.view === 'note' && (
              <span className={styles.filePath}>{activeTab.path}</span>
            )}
            <button className={styles.closeTab} onClick={() => closeTab(activeTab.id)} title="Close">
              <X size={12} />
            </button>
          </div>
        ) : (
          <span className={styles.noFile}>No note open</span>
        )}

        <div className={styles.tabActions}>
          {activeTab?.view === 'note' && !isCapacitor && (
            <div className={styles.modeToggle}>
              {(['source', 'split', 'preview'] as const).map(m => (
                <button key={m} className={editorMode === m ? styles.modeActive : ''} onClick={() => setEditorMode(m)}>
                  {m}
                </button>
              ))}
            </div>
          )}
          <button
            className={`${styles.infoBtn} ${rightOpen ? styles.infoBtnActive : ''}`}
            onClick={toggleRight}
            title="Note info — backlinks, outline, tags"
          >
            <PanelRightOpen size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {!activeTab && <div className={styles.empty}>Open a note from the sidebar or create one with +</div>}
        {activeTab?.view === 'graph' && <GraphView />}
        {activeTab?.view === 'note' && activeTab && <NoteEditor path={activeTab.path} />}
      </div>
    </main>
  )
}
