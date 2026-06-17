import { useVaultStore } from '../stores/vaultStore'
import styles from './CommandPalette.module.css'

const COMMANDS = [
  { id: 'new', label: 'New note', action: () => useVaultStore.getState().setCreateNoteOpen(true) },
  { id: 'newfolder', label: 'New project folder', action: () => useVaultStore.getState().setCreateFolderOpen(true) },
  { id: 'graph', label: 'Open graph view', action: () => useVaultStore.getState().openTab('__graph__', 'Graph', 'graph') },
  { id: 'files', label: 'Show file explorer', action: () => useVaultStore.getState().setLeftPanel('files') },
  { id: 'search', label: 'Show search', action: () => useVaultStore.getState().setLeftPanel('search') },
  { id: 'settings', label: 'Open settings', action: () => useVaultStore.getState().setSettingsOpen(true) },
  { id: 'source', label: 'Editor: Source mode', action: () => useVaultStore.getState().setEditorMode('source') },
  { id: 'preview', label: 'Editor: Preview mode', action: () => useVaultStore.getState().setEditorMode('preview') },
  { id: 'split', label: 'Editor: Split mode', action: () => useVaultStore.getState().setEditorMode('split') },
]

export function CommandPalette() {
  const open = useVaultStore(s => s.commandPaletteOpen)
  const setOpen = useVaultStore(s => s.setCommandPaletteOpen)

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
