import { useGemStore } from '../stores/gemStore'
import styles from './CommandPalette.module.css'

const COMMANDS = [
  { id: 'new', label: 'New note', action: () => useGemStore.getState().setCreateNoteOpen(true) },
  { id: 'newfolder', label: 'New project folder', action: () => useGemStore.getState().setCreateFolderOpen(true) },
  { id: 'graph', label: 'Open graph view', action: () => useGemStore.getState().openTab('__graph__', 'Graph', 'graph') },
  { id: 'files', label: 'Show file explorer', action: () => useGemStore.getState().setLeftPanel('files') },
  { id: 'search', label: 'Show search', action: () => useGemStore.getState().setLeftPanel('search') },
  { id: 'settings', label: 'Open settings', action: () => useGemStore.getState().setSettingsOpen(true) },
  { id: 'source', label: 'Editor: Source mode', action: () => useGemStore.getState().setEditorMode('source') },
  { id: 'preview', label: 'Editor: Preview mode', action: () => useGemStore.getState().setEditorMode('preview') },
  { id: 'split', label: 'Editor: Split mode', action: () => useGemStore.getState().setEditorMode('split') },
]

export function CommandPalette() {
  const open = useGemStore(s => s.commandPaletteOpen)
  const setOpen = useGemStore(s => s.setCommandPaletteOpen)

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.palette} onClick={e => e.stopPropagation()}>
        <input className={styles.input} placeholder="Type a command…" autoFocus />
        <div className={styles.list}>
          {COMMANDS.map(cmd => (
            <button key={cmd.id} className={styles.item} onClick={() => { cmd.action(); setOpen(false) }}>
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
